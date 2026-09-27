import React, { useState, useMemo } from 'react';
import { LedgerEntry, Partner, Project, VoteDecision } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  getEntryTypeMeta 
} from '../utils/storage';
import { 
  CheckCircle2, 
  Clock, 
  Check, 
  X, 
  Paperclip, 
  ChevronRight, 
  AlertCircle
} from 'lucide-react';

interface ApprovalsViewProps {
  entries: LedgerEntry[];
  project: Project;
  activePartner: Partner;
  onSelectEntry: (entry: LedgerEntry) => void;
  onQuickVote: (entryId: string, decision: VoteDecision, note?: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  entries,
  project,
  activePartner,
  onSelectEntry,
  onQuickVote,
}) => {
  const [subTab, setSubTab] = useState<'needs_my_review' | 'all_pending' | 'resolved'>('needs_my_review');
  const [rejectingEntryId, setRejectingEntryId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const partnerMap = useMemo(() => new Map(project.partners.map(p => [p.id, p])), [project.partners]);
  const projectEntries = useMemo(() => entries.filter(e => e.projectId === project.id), [entries, project.id]);

  // Entries requiring active partner's review
  const needsMyReview = useMemo(() => {
    return projectEntries.filter(e => {
      if (e.status !== 'pending') return false;
      const isApprover = e.requiredApproverPartnerIds.includes(activePartner.id);
      if (!isApprover) return false;
      const myVote = e.votes.find(v => v.partnerId === activePartner.id);
      return !myVote || myVote.decision === 'pending';
    });
  }, [projectEntries, activePartner.id]);

  // All pending entries
  const allPending = useMemo(() => {
    return projectEntries.filter(e => e.status === 'pending');
  }, [projectEntries]);

  // Resolved
  const resolvedList = useMemo(() => {
    return projectEntries
      .filter(e => e.status === 'approved' || e.status === 'rejected')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }, [projectEntries]);

  const handleConfirmReject = (entryId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a short reason for rejecting.');
      return;
    }
    onQuickVote(entryId, 'rejected', rejectionReason.trim());
    setRejectingEntryId(null);
    setRejectionReason('');
  };

  const displayedList = subTab === 'needs_my_review' 
    ? needsMyReview 
    : subTab === 'all_pending' 
    ? allPending 
    : resolvedList;

  return (
    <div className="space-y-3.5 pb-28 max-w-md mx-auto px-4 pt-3.5">
      
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-stone-900">Mutual Partner Sign-Offs (साझेदार सहमति)</h2>
        <p className="text-xs text-stone-500">
          Verify and mutually approve money introduced into the business setup pool
        </p>
      </div>

      {/* Clean Sub Tabs */}
      <div className="flex bg-stone-200/70 p-1 rounded-xl text-xs font-semibold text-stone-600">
        <button
          id="approvals-tab-my-review"
          onClick={() => setSubTab('needs_my_review')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'needs_my_review'
              ? 'bg-white text-stone-900 shadow-2xs'
              : 'hover:text-stone-900'
          }`}
        >
          <span>Action Required</span>
          {needsMyReview.length > 0 && (
            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {needsMyReview.length}
            </span>
          )}
        </button>

        <button
          id="approvals-tab-all-pending"
          onClick={() => setSubTab('all_pending')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'all_pending'
              ? 'bg-white text-stone-900 shadow-2xs'
              : 'hover:text-stone-900'
          }`}
        >
          <span>All Pending ({allPending.length})</span>
        </button>

        <button
          id="approvals-tab-resolved"
          onClick={() => setSubTab('resolved')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'resolved'
              ? 'bg-white text-stone-900 shadow-2xs'
              : 'hover:text-stone-900'
          }`}
        >
          <span>History</span>
        </button>
      </div>

      {/* Approvals Cards */}
      <div className="space-y-3">
        {displayedList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-2 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-stone-900">
              {subTab === 'needs_my_review' ? 'No pending actions' : 'No records'}
            </h4>
            <p className="text-xs text-stone-500">
              {subTab === 'needs_my_review'
                ? `You have approved all entries waiting for ${activePartner.name}.`
                : 'No approvals currently in this list.'}
            </p>
          </div>
        ) : (
          displayedList.map((entry) => {
            const typeMeta = getEntryTypeMeta(entry.type);
            const creator = partnerMap.get(entry.createdByPartnerId);
            const payer = entry.payerPartnerId ? partnerMap.get(entry.payerPartnerId) : null;
            const myVote = entry.votes.find(v => v.partnerId === activePartner.id);
            const canVote = entry.status === 'pending' && entry.requiredApproverPartnerIds.includes(activePartner.id);

            const approvedVotesCount = entry.votes.filter(v => v.decision === 'approved').length;
            const totalRequiredVotes = entry.requiredApproverPartnerIds.length;

            return (
              <div
                key={entry.id}
                id={`approval-card-${entry.id}`}
                className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-3"
              >
                {/* Header info */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500 font-medium">
                    {typeMeta.label} • {formatDate(entry.date)}
                  </span>

                  <div className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-200/60">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{approvedVotesCount}/{totalRequiredVotes} Approved</span>
                  </div>
                </div>

                {/* Title & Rupee Amount */}
                <div 
                  onClick={() => onSelectEntry(entry)}
                  className="cursor-pointer space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-stone-900 leading-snug">
                      {entry.title}
                    </h4>
                    {entry.amount !== undefined && (
                      <div className="text-right flex-shrink-0 text-sm font-bold text-stone-900">
                        {formatCurrency(entry.amount, entry.currency)}
                      </div>
                    )}
                  </div>

                  {entry.description && (
                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                      {entry.description}
                    </p>
                  )}
                </div>

                {/* Submitter & Attachment info */}
                <div className="flex items-center justify-between text-xs bg-stone-50 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (payer || creator)?.avatarColor || '#64748b' }}
                    >
                      {(payer || creator)?.name.charAt(0) || 'P'}
                    </div>
                    <span className="text-stone-700 font-medium truncate max-w-[150px]">
                      {entry.type === 'personal_expense' ? `Paid by ${payer?.name}` : `Created by ${creator?.name}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    {entry.attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-stone-500 font-medium">
                        <Paperclip className="w-3 h-3" />
                        <span>Bill attached</span>
                      </span>
                    )}
                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="text-emerald-700 font-semibold flex items-center"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1-Tap Approve / Reject Actions */}
                {canVote && (
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        id={`quick-approve-btn-${entry.id}`}
                        onClick={() => onQuickVote(entry.id, 'approved')}
                        className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Sign Off & Verify (सहमति दें)</span>
                      </button>
                      <button
                        id={`quick-reject-btn-${entry.id}`}
                        onClick={() => setRejectingEntryId(entry.id)}
                        className="py-2 px-3 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Already Voted */}
                {myVote && myVote.decision !== 'pending' && (
                  <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg flex items-center justify-between">
                    <span>
                      You voted <strong>{myVote.decision.toUpperCase()}</strong>
                    </span>
                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="text-emerald-700 font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Decline / Rejection Bottom Sheet */}
      {rejectingEntryId && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRejectingEntryId(null);
              setRejectionReason('');
            }
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white w-full sm:max-w-md max-h-[85dvh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 text-xs">
            {/* Mobile Drag Handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-stone-50 flex-shrink-0">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-stone-900">Decline Partner Sign-Off</h3>
              </div>
              <button
                onClick={() => {
                  setRejectingEntryId(null);
                  setRejectionReason('');
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto overscroll-contain">
              <p className="text-xs text-stone-600 leading-relaxed">
                Provide a short reason for declining this setup entry so your partner can revise details, fix amounts, or attach missing receipts.
              </p>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Reason for Declining *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Please provide GST tax invoice or split vendor payment..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white resize-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Pinned Safe Footer */}
            <div className="p-3.5 bg-stone-50 border-t border-stone-200 pb-safe sm:pb-3.5 flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setRejectingEntryId(null);
                  setRejectionReason('');
                }}
                className="flex-1 py-2.5 text-stone-600 hover:bg-stone-200/80 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmReject(rejectingEntryId)}
                className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 active:scale-[0.99] text-white rounded-xl font-bold transition-all shadow-xs"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
