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
                    {rejectingEntryId === entry.id ? (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl space-y-2 text-xs">
                        <div className="font-semibold text-rose-900 flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Reason for rejection:</span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Please provide GST tax bill..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setRejectingEntryId(null);
                              setRejectionReason('');
                            }}
                            className="px-2.5 py-1 text-stone-600 hover:bg-white rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmReject(entry.id)}
                            className="px-3 py-1 bg-rose-700 text-white font-semibold rounded-lg hover:bg-rose-800"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    ) : (
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
                          Question
                        </button>
                      </div>
                    )}
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

    </div>
  );
};
