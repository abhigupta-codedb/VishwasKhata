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
  loadStoredProjects,
  saveStoredProjects,
  loadStoredEntries,
  saveStoredEntries,
  loadStoredAuditLog,
  saveStoredAuditLog,
  loadActiveProjectId,
  saveActiveProjectId,
  loadActivePartnerId,
  saveActivePartnerId,
  calculateProjectFinancials,
  resetToDemoData
} from './utils/storage';

import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  seedInitialFirestoreDataIfEmpty,
  saveUserProfile,
  subscribeToProjects,
  subscribeToEntries,
  subscribeToAuditLogs,
  saveProjectToFirestore,
  saveEntryToFirestore,
  saveAuditLogToFirestore,
  resetFirestoreToDemoData
} from './services/firestoreService';

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

  // Primary Data State
  const [projects, setProjects] = useState<Project[]>(() => loadStoredProjects());
  const [entries, setEntries] = useState<LedgerEntry[]>(() => loadStoredEntries());
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>(() => loadStoredAuditLog());

  const [activeProjectId, setActiveProjectId] = useState<string>(() => loadActiveProjectId(projects));
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
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUserProfile(profile);

        // Save profile and seed initial cloud data if newly created
        if (!user.isAnonymous) {
          await saveUserProfile(profile);
        }
        await seedInitialFirestoreDataIfEmpty(user.uid, user.email || undefined, user.displayName || undefined);
      } else {
        setCurrentUserProfile(null);
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization with Firestore when signed in (Google or Anonymous Demo)
  useEffect(() => {
    if (!authUser) return;

    const unsubProjects = subscribeToProjects((remoteProjects) => {
      if (remoteProjects && remoteProjects.length > 0) {
        setProjects(remoteProjects);
        saveStoredProjects(remoteProjects);
      }
    });

    const unsubEntries = subscribeToEntries((remoteEntries) => {
      if (remoteEntries) {
        setEntries(remoteEntries);
        saveStoredEntries(remoteEntries);
      }
    });

    const unsubAudit = subscribeToAuditLogs((remoteLogs) => {
      if (remoteLogs) {
        setAuditLog(remoteLogs);
        saveStoredAuditLog(remoteLogs);
      }
    });

    return () => {
      unsubProjects();
      unsubEntries();
      unsubAudit();
    };
  }, [authUser]);

  // Current active project
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Keep activeProjectId valid
  useEffect(() => {
    if (projects.length > 0 && !projects.some(p => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  // Initialize and validate activePartnerId
  useEffect(() => {
    if (currentProject?.partners && currentProject.partners.length > 0) {
      if (!activePartnerId || !currentProject.partners.some(p => p.id === activePartnerId)) {
        // If current user's email matches a partner, auto-select that partner
        const matched = currentUserProfile?.email 
          ? currentProject.partners.find(p => p.email.toLowerCase() === currentUserProfile.email?.toLowerCase())
          : null;
        setActivePartnerId(matched ? matched.id : currentProject.partners[0].id);
      }
    }
  }, [currentProject, activePartnerId, currentUserProfile]);

  const activePartner = useMemo(() => {
    if (!currentProject || !currentProject.partners || currentProject.partners.length === 0) {
      return {
        id: 'partner_default',
        name: currentUserProfile?.displayName || 'Managing Partner',
        email: currentUserProfile?.email || 'partner@deccanstudio.in',
        role: 'Partner',
        equityPercentage: 50,
        avatarColor: '#059669',
        status: 'active' as const,
      };
    }
    return currentProject.partners.find(p => p.id === activePartnerId) || currentProject.partners[0];
  }, [currentProject, activePartnerId, currentUserProfile]);

  // Keep selectedEntry in sync when entries list is updated from Firestore
  useEffect(() => {
    if (selectedEntry) {
      const updated = entries.find(e => e.id === selectedEntry.id);
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
    return entries.filter(e => {
      if (e.projectId !== currentProject.id || e.status !== 'pending') return false;
      const isApprover = e.requiredApproverPartnerIds.includes(activePartner.id);
      if (!isApprover) return false;
      const myVote = e.votes.find(v => v.partnerId === activePartner.id);
      return !myVote || myVote.decision === 'pending';
    }).length;
  }, [entries, currentProject, activePartner.id]);

  // ---------------- Handlers ---------------- //

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    saveActiveProjectId(projectId);
    const targetProject = projects.find(p => p.id === projectId);
    if (targetProject && targetProject.partners.length > 0) {
      setActivePartnerId(targetProject.partners[0].id);
    }
  };

  const handleSelectPartner = (partnerId: string) => {
    setActivePartnerId(partnerId);
    saveActivePartnerId(partnerId);
  };

  const handleCreateEntry = async (
    newEntryData: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'amendments' | 'votes' | 'comments' | 'status'>
  ) => {
    const entryId = `entry_${Date.now()}`;
    const now = new Date().toISOString();

    const requiredApprovers = newEntryData.requiredApproverPartnerIds || [];
    const isAutoApproved = requiredApprovers.length === 0;

    const initialVotes = requiredApprovers.map(pid => ({
      partnerId: pid,
      decision: 'pending' as VoteDecision,
    }));

    const newEntry: LedgerEntry = {
      ...newEntryData,
      id: entryId,
      status: isAutoApproved ? 'approved' : 'pending',
      votes: initialVotes,
      comments: [],
      version: 1,
      amendments: [],
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local state update
    setEntries(prev => [newEntry, ...prev]);

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
    };
    setAuditLog(prev => [auditItem, ...prev]);

    // Save to Firestore
    if (authUser) {
      await saveEntryToFirestore(newEntry);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleCastVote = async (entryId: string, decision: VoteDecision, note?: string) => {
    const now = new Date().toISOString();

    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;

      const updatedVotes = entry.votes.map(v => {
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

      if (!updatedVotes.some(v => v.partnerId === activePartner.id)) {
        updatedVotes.push({
          partnerId: activePartner.id,
          decision,
          note,
          timestamp: now,
        });
      }

      let newStatus: ApprovalStatus = entry.status;
      const hasRejection = updatedVotes.some(v => v.decision === 'rejected');
      const allApproved = entry.requiredApproverPartnerIds.every(pid => {
        const vote = updatedVotes.find(v => v.partnerId === pid);
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
    }));

    const targetEntry = entries.find(e => e.id === entryId);
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
    };
    setAuditLog(prev => [auditItem, ...prev]);

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
    const now = new Date().toISOString();
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;

      const changedFields = Object.keys(updates);
      const previousValues: Record<string, any> = {};
      changedFields.forEach(f => {
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
        ? entry.requiredApproverPartnerIds.map(pid => ({
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
    }));

    const targetEntry = entries.find(e => e.id === entryId);
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
    };
    setAuditLog(prev => [auditItem, ...prev]);

    if (authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleAddComment = async (entryId: string, text: string) => {
    const now = new Date().toISOString();
    const commentId = `comm_${Date.now()}`;
    let updatedEntryToSave: LedgerEntry | null = null;

    setEntries(prev => prev.map(entry => {
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
    }));

    const targetEntry = entries.find(e => e.id === entryId);
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
    };
    setAuditLog(prev => [auditItem, ...prev]);

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

    setEntries(prev => prev.map(entry => {
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
    }));

    if (authUser && updatedEntryToSave) {
      await saveEntryToFirestore(updatedEntryToSave);
    }
  };

  const handleOpenReimburseModal = (partnerId: string, amount: number) => {
    const targetPartner = currentProject.partners.find(p => p.id === partnerId);
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
    const colors = ['#059669', '#4f46e5', '#7c3aed', '#d97706', '#0284c7', '#dc2626'];
    const newPartner: Partner = {
      id: `partner_${Date.now()}`,
      name: newPartnerData.name,
      email: newPartnerData.email,
      role: newPartnerData.role,
      equityPercentage: newPartnerData.equityPercentage,
      avatarColor: colors[currentProject.partners.length % colors.length],
      status: 'active',
    };

    const updatedProject = {
      ...currentProject,
      partners: [...currentProject.partners, newPartner],
    };

    setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));

    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      action: 'create',
      performedByPartnerId: activePartner.id,
      timestamp: new Date().toISOString(),
      summary: `${activePartner.name} added ${newPartner.name} as ${newPartner.role} (${newPartner.equityPercentage}% equity).`,
    };
    setAuditLog(prev => [auditItem, ...prev]);

    if (authUser) {
      await saveProjectToFirestore(updatedProject);
      await saveAuditLogToFirestore(auditItem);
    }
  };

  const handleCreateProject = async (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setActivePartnerId(newProject.partners[0].id);
    setCurrentTab('timeline');

    if (authUser) {
      await saveProjectToFirestore(newProject);
    }
  };

  const handleUpdateProjectSettings = async (newCurrency: string, newThreshold: number) => {
    const updatedProject = {
      ...currentProject,
      currency: newCurrency,
      defaultApprovalThreshold: newThreshold,
    };
    setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));

    if (authUser) {
      await saveProjectToFirestore(updatedProject);
    }
  };

  const handleResetData = async () => {
    if (authUser) {
      try {
        await resetFirestoreToDemoData(currentUserProfile?.email || undefined, currentUserProfile?.displayName || undefined);
      } catch (e) {
        console.error('Firestore reset error:', e);
      }
    }
    const reset = resetToDemoData();
    setProjects(reset.projects);
    setEntries(reset.entries);
    setAuditLog(reset.auditLog);
    setActiveProjectId(reset.activeProjectId);
    setActivePartnerId(reset.activePartnerId);
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

  if (!currentProject || !financials) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-stone-50 p-6 text-center shadow-sm border border-stone-200">
          <h1 className="text-lg font-bold text-stone-900">Create your first project</h1>
          <p className="mt-2 text-sm text-stone-500">Start a shared ledger to track partner money and approvals.</p>
          <button
            type="button"
            onClick={() => setIsNewProjectModalOpen(true)}
            className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create project
          </button>
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
