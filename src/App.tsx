import React, { useState, useEffect, useMemo } from 'react';
import { 
  Project, 
  LedgerEntry, 
  AuditLogItem, 
  Partner, 
  NavigationTab, 
  VoteDecision, 
  ApprovalStatus,
  EntryType
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
  // Primary State
  const [projects, setProjects] = useState<Project[]>(() => loadStoredProjects());
  const [entries, setEntries] = useState<LedgerEntry[]>(() => loadStoredEntries());
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>(() => loadStoredAuditLog());

  const [activeProjectId, setActiveProjectId] = useState<string>(() => loadActiveProjectId(projects));
  
  // Current active project
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Active partner persona for testing and multi-partner voting
  const [activePartnerId, setActivePartnerId] = useState<string>(() => {
    return loadActivePartnerId(currentProject?.partners || []);
  });

  const activePartner = useMemo(() => {
    if (!currentProject) return {
      id: 'partner_default',
      name: 'Default Partner',
      email: 'partner@example.com',
      role: 'Partner',
      equityPercentage: 50,
      avatarColor: '#059669',
      status: 'active' as const,
    };
    return currentProject.partners.find(p => p.id === activePartnerId) || currentProject.partners[0];
  }, [currentProject, activePartnerId]);

  // Navigation & Modals
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

  // Sync to storage
  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveStoredEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveStoredAuditLog(auditLog);
  }, [auditLog]);

  useEffect(() => {
    if (activeProjectId) saveActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    if (activePartnerId) saveActivePartnerId(activePartnerId);
  }, [activePartnerId]);

  // Financial calculations
  const financials = useMemo(() => {
    return calculateProjectFinancials(currentProject, entries);
  }, [currentProject, entries]);

  // Count pending approvals specifically awaiting this active partner's review
  const pendingApprovalsForActivePartner = useMemo(() => {
    return entries.filter(e => {
      if (e.projectId !== currentProject.id || e.status !== 'pending') return false;
      const isApprover = e.requiredApproverPartnerIds.includes(activePartner.id);
      if (!isApprover) return false;
      const myVote = e.votes.find(v => v.partnerId === activePartner.id);
      return !myVote || myVote.decision === 'pending';
    }).length;
  }, [entries, currentProject.id, activePartner.id]);

  // Keep selectedEntry state in sync when entries change
  useEffect(() => {
    if (selectedEntry) {
      const updated = entries.find(e => e.id === selectedEntry.id);
      if (updated) setSelectedEntry(updated);
    }
  }, [entries]);

  // ---------------- Handlers ---------------- //

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    const targetProject = projects.find(p => p.id === projectId);
    if (targetProject && targetProject.partners.length > 0) {
      setActivePartnerId(targetProject.partners[0].id);
    }
  };

  const handleSelectPartner = (partnerId: string) => {
    setActivePartnerId(partnerId);
  };

  const handleCreateEntry = (
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
  };

  const handleCastVote = (entryId: string, decision: VoteDecision, note?: string) => {
    const now = new Date().toISOString();

    setEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;

      // Update active partner vote
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

      // If active partner wasn't in votes list yet, add them
      if (!updatedVotes.some(v => v.partnerId === activePartner.id)) {
        updatedVotes.push({
          partnerId: activePartner.id,
          decision,
          note,
          timestamp: now,
        });
      }

      // Calculate new overall status
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

      return {
        ...entry,
        votes: updatedVotes,
        status: newStatus,
        updatedAt: now,
      };
    }));

    // Record audit log
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
  };

  const handleAmendEntry = (
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

      // Reset votes if partner re-approval is required
      const newVotes = requireReapproval
        ? entry.requiredApproverPartnerIds.map(pid => ({
            partnerId: pid,
            decision: pid === activePartner.id ? ('approved' as VoteDecision) : ('pending' as VoteDecision),
            timestamp: pid === activePartner.id ? now : undefined,
          }))
        : entry.votes;

      return {
        ...entry,
        ...updates,
        version: entry.version + 1,
        amendments: [...entry.amendments, newAmendment],
        status: requireReapproval ? 'pending' : entry.status,
        votes: newVotes,
        updatedAt: now,
      };
    }));

    // Audit log
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
      details: `Amendment Reason: ${reason}. Changed: ${Object.keys(updates).join(', ')}`,
    };
    setAuditLog(prev => [auditItem, ...prev]);
  };

  const handleAddComment = (entryId: string, text: string) => {
    const now = new Date().toISOString();
    const commentId = `comm_${Date.now()}`;

    setEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      return {
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
  };

  const handleAddAttachment = (
    entryId: string,
    file: { name: string; fileType: string; url: string; sizeKb: number }
  ) => {
    const now = new Date().toISOString();
    const attId = `att_${Date.now()}`;

    setEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      return {
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
    }));
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

  const handleInvitePartner = (newPartnerData: {
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

    setProjects(prev => prev.map(p => {
      if (p.id !== currentProject.id) return p;
      return {
        ...p,
        partners: [...p.partners, newPartner],
      };
    }));

    const auditItem: AuditLogItem = {
      id: `audit_${Date.now()}`,
      projectId: currentProject.id,
      action: 'create',
      performedByPartnerId: activePartner.id,
      timestamp: new Date().toISOString(),
      summary: `${activePartner.name} added ${newPartner.name} as ${newPartner.role} (${newPartner.equityPercentage}% equity).`,
    };
    setAuditLog(prev => [auditItem, ...prev]);
  };

  const handleCreateProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setActivePartnerId(newProject.partners[0].id);
    setCurrentTab('timeline');
  };

  const handleUpdateProjectSettings = (newCurrency: string, newThreshold: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== currentProject.id) return p;
      return {
        ...p,
        currency: newCurrency,
        defaultApprovalThreshold: newThreshold,
      };
    }));
  };

  const handleResetData = () => {
    const reset = resetToDemoData();
    setProjects(reset.projects);
    setEntries(reset.entries);
    setAuditLog(reset.auditLog);
    setActiveProjectId(reset.activeProjectId);
    setActivePartnerId(reset.activePartnerId);
    setSelectedEntry(null);
    setCurrentTab('timeline');
  };

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
              onSelectPartner={handleSelectPartner}
              onSelectProject={handleSelectProject}
              onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
              onInvitePartner={handleInvitePartner}
              onResetData={handleResetData}
              onUpdateProjectSettings={handleUpdateProjectSettings}
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
