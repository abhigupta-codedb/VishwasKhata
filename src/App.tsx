import React, { useState, useEffect, useMemo } from 'react';
import { 
  Project, 
  LedgerEntry, 
  AuditLogItem, 
  Partner, 
  NavigationTab, 
  VoteDecision, 
  ApprovalStatus,
  EntryType,
  UserProfile,
  Attachment
} from './types';
import {
  calculateProjectFinancials,
  resetToDemoData
} from './utils/storage';

import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  saveUserProfile,
  linkPendingEmailInvitations,
  subscribeToUserProjects,
  subscribeToProjectEntries,
  subscribeToProjectAuditLogs,
  saveProjectToFirestore,
  saveEntryToFirestore,
  saveAuditLogToFirestore,
  checkIsUserAllowed,
  isUserAdmin,
  addAllowedUser
} from './services/firestoreService';
import { evaluateEntryStatus, getApprovalRequirement } from './utils/approvalPolicy';
import { DEMO_PROJECTS, DEMO_ENTRIES, DEMO_AUDIT_LOG } from './data/demoData';

import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TimelineView } from './components/TimelineView';
import { MoneyView } from './components/MoneyView';
import { AddEntryModal } from './components/AddEntryModal';
import { EntryDetailModal } from './components/EntryDetailModal';
import { ApprovalsView } from './components/ApprovalsView';
import { MoreView } from './components/MoreView';
import { NewProjectModal } from './components/NewProjectModal';

export default function App() {
  // Authentication & Demo state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [blockedEmail, setBlockedEmail] = useState<string | null>(null);

  // Primary Data State (Starts empty, populated strictly by authorized Firestore queries)
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>([]);

  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activePartnerId, setActivePartnerId] = useState<string>('');

  // Modals & Navigation
  const [currentTab, setCurrentTab] = useState<NavigationTab>('timeline');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPrefill, setAddModalPrefill] = useState<{
    type?: EntryType;
    recipientPartnerId?: string;
    payerPartnerId?: string;
    amount?: number;
    title?: string;
    category?: string;
  } | undefined>(undefined);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Track Firebase Auth state with invite-only allowed_users verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Disallow public anonymous signups
        if (user.isAnonymous) {
          await signOut(auth);
          setAuthUser(null);
          setCurrentUserProfile(null);
          setIsDemoMode(false);
          setAuthInitialized(true);
          return;
        }

        // Verify that user's email exists in the allowed_users table
        const email = user.email;
        const isAllowed = await checkIsUserAllowed(email);

        if (!isAllowed) {
          // Block access and sign out
          await signOut(auth);
          setBlockedEmail(email || 'Unknown account');
          setAuthUser(null);
          setCurrentUserProfile(null);
          setIsDemoMode(false);
          setAuthInitialized(true);
          return;
        }

        // Approved user: Clear any block and proceed
        setBlockedEmail(null);
        setAuthUser(user);
        setIsDemoMode(false);

        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUserProfile(profile);

        // Save authenticated user profile and claim pending project email invites
        await saveUserProfile(profile);
        await linkPendingEmailInvitations(user.uid, user.email);
      } else {
        setAuthUser(null);
        setCurrentUserProfile(null);
        setIsDemoMode(false);
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Multi-tenant Firestore subscription: Only projects where user UID is authorized
  useEffect(() => {
    // If not authenticated and in client-only demo mode
    if ((!authUser || authUser.isAnonymous) && isDemoMode) {
      setProjects(DEMO_PROJECTS);
      setEntries(DEMO_ENTRIES);
      setAuditLog(DEMO_AUDIT_LOG);
      if (!activeProjectId) setActiveProjectId(DEMO_PROJECTS[0].id);
      return;
    }

    if (!authUser) {
      setProjects([]);
      setEntries([]);
      setAuditLog([]);
      return;
    }

    // Subscribe to authorized projects for this user UID & Email
    const unsubProjects = subscribeToUserProjects(
      authUser.uid,
      authUser.email,
      (authorizedProjects) => {
        setProjects(authorizedProjects);
        if (authorizedProjects.length > 0) {
          setActiveProjectId((prev) => {
            if (prev && authorizedProjects.some((p) => p.id === prev)) return prev;
            return authorizedProjects[0].id;
          });
        } else {
          setActiveProjectId('');
        }
      },
      (err) => {
        console.warn('Projects subscription error:', err);
      }
    );

    return () => {
      unsubProjects();
    };
  }, [authUser, isDemoMode]);

  // Subscribe strictly to entries and audit logs of the SELECTED project (never download other projects' data)
  useEffect(() => {
    if (isDemoMode) return;
    if (!activeProjectId) {
      setEntries([]);
      setAuditLog([]);
      return;
    }

    const unsubEntries = subscribeToProjectEntries(
      activeProjectId,
      (remoteEntries) => {
        setEntries(remoteEntries);
      }
    );

    const unsubAudit = subscribeToProjectAuditLogs(
      activeProjectId,
      (remoteLogs) => {
        setAuditLog(remoteLogs);
      }
    );

    return () => {
      unsubEntries();
      unsubAudit();
    };
  }, [activeProjectId, isDemoMode]);

  // Current active project
  const currentProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Determine if authenticated user is project owner
  const isProjectOwner = useMemo(() => {
    if (isDemoMode) return true;
    if (!authUser || !currentProject) return false;
    return currentProject.ownerUid === authUser.uid;
  }, [authUser, currentProject, isDemoMode]);

  // Map Firebase UID to Partner Profile (Requirement 6: Disallow Impersonation in Production)
  const activePartner = useMemo<Partner>(() => {
    if (!currentProject || !currentProject.partners || currentProject.partners.length === 0) {
      return {
        id: `partner_${authUser?.uid || 'user'}`,
        uid: authUser?.uid,
        name: currentUserProfile?.displayName || authUser?.displayName || 'Lead Partner',
        email: currentUserProfile?.email || authUser?.email || 'partner@khata.app',
        role: 'Founder',
        equityPercentage: 100,
        avatarColor: '#059669',
        status: 'active',
        isOwner: true,
      };
    }

    // In Demo Mode: Allow persona simulation via activePartnerId
    if (isDemoMode) {
      return currentProject.partners.find((p) => p.id === activePartnerId) || currentProject.partners[0];
    }

    // In Production: Strict identity mapping by Firebase UID or Email
    if (authUser) {
      // 1. Match by UID
      const matchByUid = currentProject.partners.find((p) => p.uid === authUser.uid);
      if (matchByUid) return matchByUid;

      // 2. Match by email
      if (authUser.email) {
        const matchByEmail = currentProject.partners.find(
          (p) => p.email && p.email.trim().toLowerCase() === authUser.email!.trim().toLowerCase()
        );
        if (matchByEmail) return matchByEmail;
      }

      // 3. Match owner
      if (currentProject.ownerUid === authUser.uid) {
        const ownerPartner = currentProject.partners.find((p) => p.isOwner);
        if (ownerPartner) return ownerPartner;
      }
    }

    // Fallback if not matched yet
    return currentProject.partners[0];
  }, [currentProject, activePartnerId, isDemoMode, authUser, currentUserProfile]);

  // Sync activePartnerId in demo mode
  useEffect(() => {
    if (isDemoMode && currentProject?.partners && currentProject.partners.length > 0) {
      if (!activePartnerId || !currentProject.partners.some((p) => p.id === activePartnerId)) {
        setActivePartnerId(currentProject.partners[0].id);
      }
    }
  }, [currentProject, activePartnerId, isDemoMode]);

  // Keep selectedEntry in sync
  useEffect(() => {
    if (selectedEntry) {
      const updated = entries.find((e) => e.id === selectedEntry.id);
      if (updated) setSelectedEntry(updated);
    }
  }, [entries]);

  // Financial calculations
  const financials = useMemo(() => {
    return currentProject ? calculateProjectFinancials(currentProject, entries) : null;
  }, [currentProject, entries]);

  // Pending approvals for active partner
  const pendingApprovalsForActivePartner = useMemo(() => {
    if (!currentProject) return 0;
    return entries.filter((e) => {
      if (e.projectId !== currentProject.id || e.status !== 'pending') return false;
      const isApprover = e.requiredApproverPartnerIds.includes(activePartner.id);
      if (!isApprover) return false;
      const myVote = e.votes.find((v) => v.partnerId === activePartner.id);
      return !myVote || myVote.decision === 'pending';
    }).length;
  }, [entries, currentProject, activePartner.id]);

  // ---------------- Handlers ---------------- //

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    const targetProject = projects.find((p) => p.id === projectId);
    if (targetProject && targetProject.partners.length > 0 && isDemoMode) {
      setActivePartnerId(targetProject.partners[0].id);
    }
  };

  // Partner persona switching is ONLY permitted in Demo Mode
  const handleSelectPartner = (partnerId: string) => {
    if (!isDemoMode) {
      console.warn('Persona switching is strictly disabled in production authenticated mode.');
      return;
    }
    setActivePartnerId(partnerId);
  };

  const handleCreateEntry = async (
    newEntryData: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'amendments' | 'votes' | 'comments' | 'status'> & { status: 'pending' | 'approved' }
  ) => {
    if (!currentProject) return;

    const entryId = `entry_${Date.now()}`;
    const now = new Date().toISOString();
    const effectiveUid = authUser?.uid || activePartner.uid || 'anon_user';

    const requiredApprovers = newEntryData.requiredApproverPartnerIds || [];
    const isAutoApproved = newEntryData.status === 'approved' || requiredApprovers.length === 0;

    const initialVotes = requiredApprovers.map((pid) => ({
      partnerId: pid,
      decision: 'pending' as VoteDecision,
    }));

    const newEntry: LedgerEntry = {
      ...newEntryData,
      id: entryId,
      projectId: currentProject.id,
      status: isAutoApproved ? 'approved' : 'pending',
      votes: initialVotes,
      comments: [],
      version: 1,
      amendments: [],
      createdByUid: effectiveUid,
      isDemo: !!currentProject.isDemo,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local state update
    setEntries((prev) => [newEntry, ...prev]);

    // Record audit log with real actorUid
    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      entryId: newEntry.id,
      entryTitle: newEntry.title,
      action: 'create',
      performedByPartnerId: activePartner.id,
      actorUid: effectiveUid,
      timestamp: now,
      summary: `${activePartner.name} created ${newEntry.title} (${isAutoApproved ? 'pre-approved' : 'pending partner sign-off'}).`,
      details: newEntry.amount ? `Amount: ${currentProject.currency}${newEntry.amount}` : undefined,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    // Persist to Firestore only if production
    if (!isDemoMode && authUser) {
      try {
        await saveEntryToFirestore(newEntry);
        await saveAuditLogToFirestore(auditItem);
      } catch (err) {
        console.error('Failed to persist entry or audit log to Firestore:', err);
      }
    }
  };

  const handleCastVote = async (entryId: string, decision: VoteDecision, note?: string) => {
    if (!currentProject) return;
    const now = new Date().toISOString();
    const effectiveUid = authUser?.uid || activePartner.uid || 'anon_user';
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        // Prevent duplicate vote by replacing or adding vote for active partner
        const updatedVotes = entry.votes.map((v) => {
          if (v.partnerId === activePartner.id) {
            return {
              ...v,
              approverUid: effectiveUid,
              decision,
              note: note || v.note,
              timestamp: now,
            };
          }
          return v;
        });

        if (!updatedVotes.some((v) => v.partnerId === activePartner.id)) {
          updatedVotes.push({
            partnerId: activePartner.id,
            approverUid: effectiveUid,
            decision,
            note,
            timestamp: now,
          });
        }

        // Centralized status evaluation according to project approval threshold & unanimity rules
        const evalResult = evaluateEntryStatus({ ...entry, votes: updatedVotes }, currentProject);

        const res: LedgerEntry = {
          ...entry,
          votes: updatedVotes,
          status: evalResult.status,
          updatedAt: now,
        };
        updatedEntryToSave = res;
        return res;
      })
    );

    const targetEntry = entries.find((e) => e.id === entryId);
    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      entryId,
      entryTitle: targetEntry?.title,
      action: decision === 'approved' ? 'approve' : 'reject',
      performedByPartnerId: activePartner.id,
      actorUid: effectiveUid,
      timestamp: now,
      summary: `${activePartner.name} voted ${decision.toUpperCase()} on "${targetEntry?.title || 'Entry'}".`,
      details: note ? `Note: ${note}` : undefined,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (!isDemoMode && authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleAmendEntry = async (
    entryId: string,
    reason: string,
    updates: {
      title?: string;
      amount?: number;
      category?: string;
      description?: string;
    },
    requireReapproval: boolean
  ) => {
    if (!currentProject) return;
    const now = new Date().toISOString();
    const effectiveUid = authUser?.uid || activePartner.uid || 'anon_user';
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        const changedFields = Object.keys(updates);
        const previousValues: Record<string, any> = {};
        changedFields.forEach((f) => {
          previousValues[f] = (entry as any)[f];
        });

        const newAmendment = {
          id: `amen_${Date.now()}`,
          version: entry.version,
          amendedByPartnerId: activePartner.id,
          reason,
          timestamp: now,
          changedFields,
          previousValues,
        };

        const newVotes = requireReapproval
          ? entry.requiredApproverPartnerIds.map((pid) => ({
              partnerId: pid,
              approverUid: pid === activePartner.id ? effectiveUid : undefined,
              decision: pid === activePartner.id ? ('approved' as VoteDecision) : ('pending' as VoteDecision),
              timestamp: pid === activePartner.id ? now : undefined,
            }))
          : entry.votes;

        const res: LedgerEntry = {
          ...entry,
          ...updates,
          version: entry.version + 1,
          amendments: [...entry.amendments, newAmendment],
          status: requireReapproval ? ('pending' as ApprovalStatus) : entry.status,
          votes: newVotes,
          updatedAt: now,
        };
        updatedEntryToSave = res;
        return res;
      })
    );

    const targetEntry = entries.find((e) => e.id === entryId);
    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      entryId,
      entryTitle: targetEntry?.title,
      action: 'amend',
      performedByPartnerId: activePartner.id,
      actorUid: effectiveUid,
      timestamp: now,
      summary: `${activePartner.name} amended "${targetEntry?.title || 'Entry'}" (v${(targetEntry?.version || 1) + 1}).`,
      details: `Reason: ${reason}. Fields: ${Object.keys(updates).join(', ')}`,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (!isDemoMode && authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleAddComment = async (entryId: string, text: string) => {
    if (!currentProject) return;
    const now = new Date().toISOString();
    const effectiveUid = authUser?.uid || activePartner.uid || 'anon_user';
    const commentId = `comm_${Date.now()}`;
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        const res: LedgerEntry = {
          ...entry,
          comments: [
            ...entry.comments,
            {
              id: commentId,
              partnerId: activePartner.id,
              text,
              createdAt: now,
            },
          ],
          updatedAt: now,
        };
        updatedEntryToSave = res;
        return res;
      })
    );

    const targetEntry = entries.find((e) => e.id === entryId);
    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      entryId,
      entryTitle: targetEntry?.title,
      action: 'comment',
      performedByPartnerId: activePartner.id,
      actorUid: effectiveUid,
      timestamp: now,
      summary: `${activePartner.name} commented on "${targetEntry?.title}".`,
      details: text,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (!isDemoMode && authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleAddAttachment = async (entryId: string, attachment: Attachment) => {
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        const res: LedgerEntry = {
          ...entry,
          attachments: [...entry.attachments, attachment],
          updatedAt: new Date().toISOString(),
        };
        updatedEntryToSave = res;
        return res;
      })
    );

    if (!isDemoMode && authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
    }
  };

  const handleOpenReimburseModal = (partnerId: string, amount: number) => {
    if (!currentProject) return;
    const targetPartner = currentProject.partners.find((p) => p.id === partnerId);
    setAddModalPrefill({
      type: 'reimbursement',
      recipientPartnerId: partnerId,
      amount,
      title: `Reimburse ${targetPartner?.name || 'Partner'} for approved out-of-pocket expenses`,
      category: 'Reimbursement',
    });
    setIsAddModalOpen(true);
  };

  const handleInvitePartner = async (newPartnerData: {
    name: string;
    email: string;
    role: string;
    equityPercentage: number;
  }) => {
    if (!currentProject) return;
    const colors = ['#059669', '#4f46e5', '#7c3aed', '#d97706', '#0284c7', '#dc2626'];
    const newPartner: Partner = {
      id: `partner_${Date.now()}`,
      name: newPartnerData.name,
      email: newPartnerData.email.trim().toLowerCase(),
      role: newPartnerData.role,
      equityPercentage: newPartnerData.equityPercentage,
      avatarColor: colors[currentProject.partners.length % colors.length],
      status: 'active',
    };

    // Update authorized emails to grant multi-tenant access to invited partner
    const authorizedEmails = new Set(currentProject.authorizedEmails || []);
    authorizedEmails.add(newPartner.email!);

    const updatedProject: Project = {
      ...currentProject,
      partners: [...currentProject.partners, newPartner],
      authorizedEmails: Array.from(authorizedEmails),
    };

    setProjects((prev) => prev.map((p) => (p.id === currentProject.id ? updatedProject : p)));

    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      action: 'create',
      performedByPartnerId: activePartner.id,
      actorUid: authUser?.uid || activePartner.uid,
      timestamp: new Date().toISOString(),
      summary: `${activePartner.name} added ${newPartner.name} as ${newPartner.role} (${newPartner.equityPercentage}% equity).`,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (!isDemoMode && authUser) {
      await saveProjectToFirestore(updatedProject);
      await saveAuditLogToFirestore(auditItem);
      // Also pre-approve invited partner email in allowed_users table
      if (newPartner.email) {
        try {
          await addAllowedUser(
            newPartner.email,
            `Invited by ${activePartner.name} for ${currentProject.name}`,
            'partner',
            authUser.email || undefined
          );
        } catch (e) {
          console.warn('Auto-approving invited partner in allowed_users note:', e);
        }
      }
    }
  };

  const handleCreateProject = async (newProjectData: Project) => {
    try {
      const allAuthorizedEmails = new Set<string>();
      if (currentUserProfile?.email) allAuthorizedEmails.add(currentUserProfile.email.trim().toLowerCase());
      if (authUser?.email) allAuthorizedEmails.add(authUser.email.trim().toLowerCase());
      newProjectData.partners.forEach((p) => {
        if (p.email) allAuthorizedEmails.add(p.email.trim().toLowerCase());
      });

      const projectWithOwner: Project = {
        ...newProjectData,
        ownerUid: authUser?.uid || 'user',
        authorizedUserUids: authUser?.uid ? [authUser.uid] : [],
        authorizedEmails: Array.from(allAuthorizedEmails),
        isDemo: isDemoMode,
      };

      setProjects((prev) => [projectWithOwner, ...prev]);
      setActiveProjectId(projectWithOwner.id);
      if (projectWithOwner.partners.length > 0 && isDemoMode) {
        setActivePartnerId(projectWithOwner.partners[0].id);
      }
      setCurrentTab('timeline');

      if (!isDemoMode && authUser) {
        await saveProjectToFirestore(projectWithOwner);
      }
    } catch (err) {
      console.error('Failed to create project in Firestore:', err);
    }
  };

  const handleUpdateProjectSettings = async (newCurrency: string, newThreshold: number) => {
    if (!currentProject) return;
    const updatedProject: Project = {
      ...currentProject,
      currency: newCurrency,
      defaultApprovalThreshold: newThreshold,
    };
    setProjects((prev) => prev.map((p) => (p.id === currentProject.id ? updatedProject : p)));

    if (!isDemoMode && authUser) {
      await saveProjectToFirestore(updatedProject);
    }
  };

  const handleResetData = async () => {
    if (isDemoMode) {
      setProjects(DEMO_PROJECTS);
      setEntries(DEMO_ENTRIES);
      setAuditLog(DEMO_AUDIT_LOG);
      setActiveProjectId(DEMO_PROJECTS[0].id);
      setActivePartnerId(DEMO_PROJECTS[0].partners[0].id);
    } else {
      const reset = resetToDemoData();
      setProjects(reset.projects);
      setEntries(reset.entries);
      setAuditLog(reset.auditLog);
    }
    setSelectedEntry(null);
    setCurrentTab('timeline');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setIsDemoMode(false);
    setProjects([]);
    setEntries([]);
    setAuditLog([]);
  };

  // If auth is still checking initial state
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-stone-600">Connecting to Sajha Khata...</span>
        </div>
      </div>
    );
  }

  // If user is not signed in and not in demo mode, display Login & Gated Screen
  if (!authUser && !isDemoMode) {
    return (
      <AuthScreen 
        initialBlockedEmail={blockedEmail} 
        onClearBlockedEmail={() => setBlockedEmail(null)} 
      />
    );
  }

  // If user is signed in with Google, but has no projects yet (clean tenant state)
  if (!currentProject || !financials) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-stone-50 p-6 text-center shadow-sm border border-stone-200">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            ₹
          </div>
          <h1 className="text-lg font-bold text-stone-900">Create your first venture</h1>
          <p className="mt-2 text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
            Welcome, <span className="font-semibold text-stone-700">{currentUserProfile?.displayName || currentUserProfile?.email}</span>. Start an isolated, private ledger for your partnership.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              id="create-first-project-btn"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              + Create Shared Project
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2 text-xs text-stone-500 hover:text-stone-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
        {isNewProjectModalOpen && (
          <NewProjectModal
            activePartner={activePartner}
            onClose={() => setIsNewProjectModalOpen(false)}
            onCreateProject={handleCreateProject}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans antialiased selection:bg-emerald-600 selection:text-white">
      
      {/* Mobile-Centric Container */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-stone-50/60 flex flex-col shadow-sm relative border-x border-stone-200/80">
        
        {/* Sticky Mobile Header */}
        <Header
          currentProject={currentProject}
          projects={projects}
          activePartner={activePartner}
          isDemoMode={isDemoMode}
          onSelectProject={handleSelectProject}
          onSelectPartner={handleSelectPartner}
          pendingApprovalsForActivePartner={pendingApprovalsForActivePartner}
          onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
          onNavigateToApprovals={() => setCurrentTab('approvals')}
          onSignOut={handleSignOut}
        />

        {/* View Router */}
        <main className="flex-1 overflow-x-hidden">
          {currentTab === 'timeline' && (
            <TimelineView
              entries={entries}
              project={currentProject}
              activePartner={activePartner}
              availableFunds={financials.availableFunds}
              pendingApprovalsCount={financials.pendingApprovalsCount}
              onSelectEntry={(entry) => setSelectedEntry(entry)}
              onOpenAddModal={() => {
                setAddModalPrefill(undefined);
                setIsAddModalOpen(true);
              }}
            />
          )}

          {currentTab === 'money' && (
            <MoneyView
              project={currentProject}
              entries={entries}
              activePartner={activePartner}
              onOpenReimburseModal={handleOpenReimburseModal}
              onNavigateToApprovals={() => setCurrentTab('approvals')}
            />
          )}

          {currentTab === 'approvals' && (
            <ApprovalsView
              entries={entries}
              project={currentProject}
              activePartner={activePartner}
              onSelectEntry={(entry) => setSelectedEntry(entry)}
              onQuickVote={(entryId, decision, note) => handleCastVote(entryId, decision, note)}
            />
          )}

          {currentTab === 'more' && (
            <MoreView
              project={currentProject}
              projects={projects}
              activePartner={activePartner}
              auditLog={auditLog}
              currentUser={currentUserProfile}
              isProjectOwner={isProjectOwner}
              isAdmin={isUserAdmin(authUser?.email)}
              isDemoMode={isDemoMode}
              onSelectPartner={handleSelectPartner}
              onSelectProject={handleSelectProject}
              onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
              onInvitePartner={handleInvitePartner}
              onResetData={handleResetData}
              onUpdateProjectSettings={handleUpdateProjectSettings}
              onSignOut={handleSignOut}
            />
          )}
        </main>

        {/* Sticky Bottom Navigation Bar */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'add') {
              setAddModalPrefill(undefined);
              setIsAddModalOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          pendingApprovalsCount={pendingApprovalsForActivePartner}
        />

      </div>

      {/* MODAL: Record New Entry */}
      {isAddModalOpen && (
        <AddEntryModal
          project={currentProject}
          activePartner={activePartner}
          prefill={addModalPrefill}
          onClose={() => {
            setIsAddModalOpen(false);
            setAddModalPrefill(undefined);
          }}
          onSubmit={handleCreateEntry}
        />
      )}

      {/* MODAL: Entry Details & Audit Trail & Amendments & Lightbox */}
      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          project={currentProject}
          activePartner={activePartner}
          onClose={() => setSelectedEntry(null)}
          onCastVote={handleCastVote}
          onAddComment={handleAddComment}
          onAddAttachment={handleAddAttachment}
          onAmendEntry={handleAmendEntry}
        />
      )}

      {/* MODAL: Create New Shared Project */}
      {isNewProjectModalOpen && (
        <NewProjectModal
          activePartner={activePartner}
          onClose={() => setIsNewProjectModalOpen(false)}
          onCreateProject={handleCreateProject}
        />
      )}

    </div>
  );
}
