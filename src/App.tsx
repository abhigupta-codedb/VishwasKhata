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
  UserProfile
} from './types';
import {
  calculateProjectFinancials,
  resetToDemoData
} from './utils/storage';

import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  saveUserProfile,
  subscribeToAuthorizedProjects,
  subscribeToAuthorizedEntries,
  subscribeToAuthorizedAuditLogs,
  saveProjectToFirestore,
  saveEntryToFirestore,
  saveAuditLogToFirestore,
  seedDemoDataIfMissing
} from './services/firestoreService';
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

  // Primary Data State (Starts empty, populated strictly by authorized Firestore records)
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

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        const isAnon = user.isAnonymous;
        setIsDemoMode(isAnon);

        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUserProfile(profile);

        // Save real authenticated user profile
        if (!isAnon) {
          await saveUserProfile(profile);
        } else {
          // If entering via anonymous demo, ensure isolated demo dataset exists in firestore
          await seedDemoDataIfMissing();
        }
      } else {
        setCurrentUserProfile(null);
        setIsDemoMode(false);
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Multi-tenant Firestore subscription: Only projects where user UID or Email is authorized
  useEffect(() => {
    // If not authenticated and in client-only demo fallback
    if (!authUser && isDemoMode) {
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

    const isAnon = authUser.isAnonymous;
    const unsubProjects = subscribeToAuthorizedProjects(
      authUser.uid,
      authUser.email,
      isAnon,
      (authorizedProjects) => {
        setProjects(authorizedProjects);
        if (authorizedProjects.length > 0) {
          // Keep active project valid
          setActiveProjectId((prev) => {
            if (prev && authorizedProjects.some((p) => p.id === prev)) return prev;
            return authorizedProjects[0].id;
          });
        } else {
          setActiveProjectId('');
        }
      }
    );

    return () => {
      unsubProjects();
    };
  }, [authUser, isDemoMode]);

  // Subscribe to entries and audit logs ONLY for authorized projects
  useEffect(() => {
    if (!authUser && isDemoMode) return;
    if (projects.length === 0) {
      setEntries([]);
      setAuditLog([]);
      return;
    }

    const authorizedProjectIds = projects.map((p) => p.id);

    const unsubEntries = subscribeToAuthorizedEntries(
      authorizedProjectIds,
      (remoteEntries) => {
        setEntries(remoteEntries);
      }
    );

    const unsubAudit = subscribeToAuthorizedAuditLogs(
      authorizedProjectIds,
      (remoteLogs) => {
        setAuditLog(remoteLogs);
      }
    );

    return () => {
      unsubEntries();
      unsubAudit();
    };
  }, [authUser, isDemoMode, projects]);

  // Current active project
  const currentProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Keep activePartnerId synchronized
  useEffect(() => {
    if (currentProject?.partners && currentProject.partners.length > 0) {
      if (!activePartnerId || !currentProject.partners.some((p) => p.id === activePartnerId)) {
        // Auto-select partner matching current user's email if present
        const matched = currentUserProfile?.email 
          ? currentProject.partners.find(
              (p) => p.email && p.email.toLowerCase() === currentUserProfile.email?.toLowerCase()
            )
          : null;
        setActivePartnerId(matched ? matched.id : currentProject.partners[0].id);
      }
    }
  }, [currentProject, activePartnerId, currentUserProfile]);

  const activePartner = useMemo(() => {
    if (!currentProject || !currentProject.partners || currentProject.partners.length === 0) {
      return {
        id: `partner_${authUser?.uid || 'user'}`,
        name: currentUserProfile?.displayName || authUser?.displayName || 'Lead Partner',
        email: currentUserProfile?.email || authUser?.email || 'partner@khata.app',
        role: 'Partner',
        equityPercentage: 100,
        avatarColor: '#059669',
        status: 'active' as const,
      };
    }
    return currentProject.partners.find((p) => p.id === activePartnerId) || currentProject.partners[0];
  }, [currentProject, activePartnerId, currentUserProfile, authUser]);

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
    if (targetProject && targetProject.partners.length > 0) {
      setActivePartnerId(targetProject.partners[0].id);
    }
  };

  const handleSelectPartner = (partnerId: string) => {
    setActivePartnerId(partnerId);
  };

  const handleCreateEntry = async (
    newEntryData: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'amendments' | 'votes' | 'comments' | 'status'>
  ) => {
    if (!currentProject) return;

    const entryId = `entry_${Date.now()}`;
    const now = new Date().toISOString();

    const requiredApprovers = newEntryData.requiredApproverPartnerIds || [];
    const isAutoApproved = requiredApprovers.length === 0;

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
      isDemo: !!currentProject.isDemo,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local state update
    setEntries((prev) => [newEntry, ...prev]);

    // Record audit log
    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      entryId: newEntry.id,
      entryTitle: newEntry.title,
      action: 'create',
      performedByPartnerId: activePartner.id,
      timestamp: now,
      summary: `${activePartner.name} created ${newEntry.title} (${isAutoApproved ? 'auto-approved' : 'pending partner sign-off'}).`,
      details: newEntry.amount ? `Amount: ${currentProject.currency}${newEntry.amount}` : undefined,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    // Save to Firestore
    if (authUser) {
      await saveEntryToFirestore(newEntry);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleCastVote = async (entryId: string, decision: VoteDecision, note?: string) => {
    if (!currentProject) return;
    const now = new Date().toISOString();
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        const updatedVotes = entry.votes.map((v) => {
          if (v.partnerId === activePartner.id) {
            return {
              ...v,
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
            decision,
            note,
            timestamp: now,
          });
        }

        let newStatus: ApprovalStatus = entry.status;
        const hasRejection = updatedVotes.some((v) => v.decision === 'rejected');
        const allApproved = entry.requiredApproverPartnerIds.every((pid) => {
          const vote = updatedVotes.find((v) => v.partnerId === pid);
          return vote && vote.decision === 'approved';
        });

        if (hasRejection) {
          newStatus = 'rejected';
        } else if (allApproved && entry.requiredApproverPartnerIds.length > 0) {
          newStatus = 'approved';
        } else {
          newStatus = 'pending';
        }

        const res = {
          ...entry,
          votes: updatedVotes,
          status: newStatus,
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
      timestamp: now,
      summary: `${activePartner.name} ${decision} entry "${targetEntry?.title || 'Entry'}".`,
      details: note ? `Partner Note: ${note}` : undefined,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (authUser && updatedEntryToSave) {
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
              decision: pid === activePartner.id ? ('approved' as VoteDecision) : ('pending' as VoteDecision),
              timestamp: pid === activePartner.id ? now : undefined,
            }))
          : entry.votes;

        const res = {
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
      timestamp: now,
      summary: `${activePartner.name} amended "${targetEntry?.title || 'Entry'}" (Version ${(targetEntry?.version || 1) + 1}).`,
      details: `Reason: ${reason}. Changes: ${Object.keys(updates).join(', ')}`,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleAddComment = async (entryId: string, text: string) => {
    if (!currentProject) return;
    const now = new Date().toISOString();
    const commentId = `comm_${Date.now()}`;
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        const res = {
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
      timestamp: now,
      summary: `${activePartner.name} commented on "${targetEntry?.title}".`,
      details: text,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleAddAttachment = async (
    entryId: string,
    file: { name: string; fileType: string; url: string; sizeKb: number }
  ) => {
    const now = new Date().toISOString();
    const attId = `att_${Date.now()}`;
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        const res = {
          ...entry,
          attachments: [
            ...entry.attachments,
            {
              id: attId,
              name: file.name,
              fileType: file.fileType,
              url: file.url,
              sizeKb: file.sizeKb,
              uploadedAt: now,
            },
          ],
          updatedAt: now,
        };
        updatedEntryToSave = res;
        return res;
      })
    );

    if (authUser && updatedEntryToSave) {
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
    authorizedEmails.add(newPartner.email);

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
      timestamp: new Date().toISOString(),
      summary: `${activePartner.name} added ${newPartner.name} as ${newPartner.role} (${newPartner.equityPercentage}% equity).`,
      isDemo: !!currentProject.isDemo,
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    if (authUser) {
      await saveProjectToFirestore(updatedProject);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleCreateProject = async (newProjectData: Project) => {
    const isAnon = authUser?.isAnonymous ?? isDemoMode;
    const projectWithOwner: Project = {
      ...newProjectData,
      ownerUid: authUser?.uid || 'user',
      authorizedUserUids: authUser?.uid ? [authUser.uid] : [],
      authorizedEmails: [
        ...(currentUserProfile?.email ? [currentUserProfile.email.toLowerCase()] : []),
        ...newProjectData.partners.map((p) => p.email.toLowerCase()).filter(Boolean),
      ],
      isDemo: isAnon,
    };

    setProjects((prev) => [projectWithOwner, ...prev]);
    setActiveProjectId(projectWithOwner.id);
    if (projectWithOwner.partners.length > 0) {
      setActivePartnerId(projectWithOwner.partners[0].id);
    }
    setCurrentTab('timeline');

    if (authUser) {
      await saveProjectToFirestore(projectWithOwner);
    }
  };

  const handleUpdateProjectSettings = async (newCurrency: string, newThreshold: number) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      currency: newCurrency,
      defaultApprovalThreshold: newThreshold,
    };
    setProjects((prev) => prev.map((p) => (p.id === currentProject.id ? updatedProject : p)));

    if (authUser) {
      await saveProjectToFirestore(updatedProject);
    }
  };

  const handleResetData = async () => {
    // If in demo mode, restore demo dataset
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

  // If user is not signed in and not in demo mode, display Login & Demo Screen
  if (!authUser && !isDemoMode) {
    return <AuthScreen onEnterDemo={() => setIsDemoMode(true)} />;
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
          onSelectProject={handleSelectProject}
          onSelectPartner={handleSelectPartner}
          pendingApprovalsForActivePartner={pendingApprovalsForActivePartner}
          onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
          onNavigateToApprovals={() => setCurrentTab('approvals')}
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
