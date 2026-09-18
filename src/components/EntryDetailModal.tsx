import React, { useState } from 'react';
import { LedgerEntry, Partner, Project, VoteDecision } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime, 
  getEntryTypeMeta, 
  getApprovalStatusMeta 
} from '../utils/storage';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Paperclip, 
  MessageSquare, 
  Send, 
  ShieldAlert, 
  History, 
  ExternalLink, 
  User, 
  UploadCloud, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw
} from 'lucide-react';

interface EntryDetailModalProps {
  entry: LedgerEntry | null;
  project: Project;
  activePartner: Partner;
  onClose: () => void;
  onCastVote: (entryId: string, decision: VoteDecision, note?: string) => void;
  onAddComment: (entryId: string, text: string) => void;
  onAddAttachment: (entryId: string, file: { name: string; fileType: string; url: string; sizeKb: number }) => void;
  onAmendEntry: (
    entryId: string,
    reason: string,
    updates: {
      title?: string;
      amount?: number;
      category?: string;
      description?: string;
    },
    requireReapproval: boolean
  ) => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  project,
  activePartner,
  onClose,
  onCastVote,
  onAddComment,
  onAddAttachment,
  onAmendEntry,
}) => {
  if (!entry) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments' | 'audit'>('details');
  const [commentInput, setCommentInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [showApprovalNoteField, setShowApprovalNoteField] = useState(false);

  // Amendment state
  const [isAmending, setIsAmending] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [amendedTitle, setAmendedTitle] = useState(entry.title);
  const [amendedAmount, setAmendedAmount] = useState(entry.amount !== undefined ? String(entry.amount) : '');
  const [amendedCategory, setAmendedCategory] = useState(entry.category || '');
  const [amendedDescription, setAmendedDescription] = useState(entry.description || '');
  const [requireReapproval, setRequireReapproval] = useState(true);

  // Lightbox preview for image attachments
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const typeMeta = getEntryTypeMeta(entry.type);
  const statusMeta = getApprovalStatusMeta(entry.status);

  const partnerMap = new Map(project.partners.map(p => [p.id, p]));
  const creator = partnerMap.get(entry.createdByPartnerId);
  const payer = entry.payerPartnerId ? partnerMap.get(entry.payerPartnerId) : null;
  const recipient = entry.recipientPartnerId ? partnerMap.get(entry.recipientPartnerId) : null;

  // Check if active partner is a required approver and their current vote
  const isRequiredApprover = entry.requiredApproverPartnerIds.includes(activePartner.id);
  const activePartnerVote = entry.votes.find(v => v.partnerId === activePartner.id);
  const hasVoted = activePartnerVote && activePartnerVote.decision !== 'pending';

  const handleVoteSubmit = (decision: VoteDecision) => {
    if (decision === 'rejected' && !rejectionNote.trim()) {
      alert('Please provide a reason for rejecting this entry.');
      return;
    }
    const note = decision === 'rejected' ? rejectionNote : approvalNote;
    onCastVote(entry.id, decision, note);
    setIsRejecting(false);
    setRejectionNote('');
    setApprovalNote('');
    setShowApprovalNoteField(false);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(entry.id, commentInput.trim());
    setCommentInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      onAddAttachment(entry.id, {
        name: file.name,
        fileType: file.type || 'application/octet-stream',
        url: base64Url,
        sizeKb: Math.round(file.size / 1024),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAmendment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendReason.trim()) {
      alert('You must provide a reason for the amendment to preserve the audit trail.');
      return;
    }

    const updates: {
      title?: string;
      amount?: number;
      category?: string;
      description?: string;
    } = {};

    if (amendedTitle.trim() !== entry.title) updates.title = amendedTitle.trim();
    if (entry.amount !== undefined && Number(amendedAmount) !== entry.amount) {
      updates.amount = Number(amendedAmount);
    }
    if (amendedCategory.trim() !== (entry.category || '')) updates.category = amendedCategory.trim();
    if (amendedDescription.trim() !== (entry.description || '')) updates.description = amendedDescription.trim();

    onAmendEntry(entry.id, amendReason.trim(), updates, requireReapproval);
    setIsAmending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${typeMeta.badgeBg}`}>
              {typeMeta.label}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1.5 border ${statusMeta.pillClasses}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`} />
              {statusMeta.label}
            </span>
            {entry.version > 1 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">
                v{entry.version}
              </span>
            )}
          </div>
          <button
            id="close-entry-detail-btn"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-200 px-4 bg-white text-xs font-medium text-slate-500 overflow-x-auto">
          <button
            id="tab-entry-details"
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'details' ? 'border-emerald-600 text-emerald-700 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Details & Approvals
          </button>
          <button
            id="tab-entry-comments"
            onClick={() => setActiveTab('comments')}
            className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'comments' ? 'border-emerald-600 text-emerald-700 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments</span>
            {entry.comments.length > 0 && (
              <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {entry.comments.length}
              </span>
            )}
          </button>
          <button
            id="tab-entry-attachments"
            onClick={() => setActiveTab('attachments')}
            className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'attachments' ? 'border-emerald-600 text-emerald-700 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Receipts & Docs</span>
            {entry.attachments.length > 0 && (
              <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {entry.attachments.length}
              </span>
            )}
          </button>
          <button
            id="tab-entry-audit"
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'border-emerald-600 text-emerald-700 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
            {entry.amendments.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {entry.amendments.length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: DETAILS & APPROVALS */}
          {activeTab === 'details' && (
            <>
              {/* Title & Amount Header */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {entry.title}
                  </h3>
                  {entry.amount !== undefined && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold font-mono text-slate-900">
                        {formatCurrency(entry.amount, entry.currency)}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {typeMeta.shortLabel}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
                  <span>{formatDate(entry.date)}</span>
                  <span>•</span>
                  <span>Recorded by {creator?.name || 'Partner'}</span>
                  {entry.category && (
                    <>
                      <span>•</span>
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px]">
                        {entry.category}
                      </span>
                    </>
                  )}
                  {entry.paymentMethod && (
                    <>
                      <span>•</span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded text-[11px] font-medium">
                        {entry.paymentMethod}
                      </span>
                    </>
                  )}
                  {entry.gstInvoice && (
                    <>
                      <span>•</span>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded text-[11px] font-mono">
                        GST: {entry.gstInvoice}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Payer / Recipient specifics */}
              {(payer || recipient) && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                  {payer && (
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        {entry.type === 'personal_expense' ? 'Paid Personally By' : 'Funded By Partner'}
                      </span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <div
                          className="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                          style={{ backgroundColor: payer.avatarColor }}
                        >
                          {payer.name.charAt(0)}
                        </div>
                        <span>{payer.name} ({payer.equityPercentage}%)</span>
                      </div>
                    </div>
                  )}
                  {recipient && (
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        Recipient Partner
                      </span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <div
                          className="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                          style={{ backgroundColor: recipient.avatarColor }}
                        >
                          {recipient.name.charAt(0)}
                        </div>
                        <span>{recipient.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {entry.description && (
                <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-xl p-3 leading-relaxed whitespace-pre-line">
                  {entry.description}
                </div>
              )}

              {/* Decision Options if applicable */}
              {entry.type === 'decision' && entry.decisionOptions && (
                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                    Decision Resolution & Options
                  </div>
                  <div className="space-y-1.5">
                    {entry.decisionOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`text-xs p-2 rounded-lg flex items-center justify-between ${
                          opt === entry.selectedOption
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'bg-white border border-purple-200 text-purple-900'
                        }`}
                      >
                        <span>{opt}</span>
                        {opt === entry.selectedOption && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Agreed Outcome</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* APPROVAL VOTING CONSOLE */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Partner Approval Status</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {entry.requiredApproverPartnerIds.length === 0
                      ? 'No approvals required'
                      : `${entry.votes.filter(v => v.decision === 'approved').length} of ${entry.requiredApproverPartnerIds.length} approved`}
                  </span>
                </div>

                {/* Approvers Vote List */}
                {entry.requiredApproverPartnerIds.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {entry.requiredApproverPartnerIds.map((pid) => {
                      const partner = partnerMap.get(pid);
                      const vote = entry.votes.find(v => v.partnerId === pid);
                      const decision = vote ? vote.decision : 'pending';

                      return (
                        <div
                          key={pid}
                          className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: partner?.avatarColor || '#64748b' }}
                            >
                              {partner?.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">
                                {partner?.name}
                                {pid === activePartner.id && ' (You)'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {vote?.timestamp ? formatRelativeTime(vote.timestamp) : 'Pending review'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {decision === 'approved' && (
                              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            )}
                            {decision === 'rejected' && (
                              <span className="flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Rejected</span>
                              </span>
                            )}
                            {decision === 'pending' && (
                              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ACTION: Active Partner Vote Form */}
                {isRequiredApprover && entry.status === 'pending' && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="text-xs font-semibold text-slate-800 mb-2">
                      Your vote is required as a partner:
                    </div>

                    {!isRejecting ? (
                      <div className="space-y-2">
                        {showApprovalNoteField && (
                          <input
                            type="text"
                            placeholder="Optional approval note (e.g., 'Verified against invoice')"
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            id="btn-approve-entry"
                            onClick={() => handleVoteSubmit('approved')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Entry</span>
                          </button>
                          
                          <button
                            id="btn-open-reject"
                            onClick={() => setIsRejecting(true)}
                            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-all"
                          >
                            Reject...
                          </button>

                          {!showApprovalNoteField && (
                            <button
                              onClick={() => setShowApprovalNoteField(true)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 underline px-1"
                            >
                              Add Note
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-rose-50/70 border border-rose-200 p-2.5 rounded-lg">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Reject Entry</span>
                        </div>
                        <input
                          id="rejection-reason-input"
                          type="text"
                          placeholder="State reason for rejecting (required)..."
                          value={rejectionNote}
                          onChange={(e) => setRejectionNote(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-rose-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => setIsRejecting(false)}
                            className="text-xs text-slate-600 px-2 py-1 hover:bg-white rounded"
                          >
                            Cancel
                          </button>
                          <button
                            id="btn-confirm-reject"
                            onClick={() => handleVoteSubmit('rejected')}
                            className="text-xs font-semibold px-3 py-1 bg-rose-600 text-white rounded hover:bg-rose-700"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* If partner already voted */}
                {hasVoted && (
                  <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                    <span>
                      You voted <strong>{activePartnerVote.decision.toUpperCase()}</strong> on{' '}
                      {formatDate(activePartnerVote.timestamp || entry.updatedAt)}
                    </span>
                    {entry.status === 'pending' && (
                      <button
                        onClick={() => onCastVote(entry.id, 'pending')}
                        className="text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Change Vote</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* AMENDMENT CALLOUT: If approved, allow amending with audit trail */}
              {entry.status === 'approved' && !isAmending && (
                <div className="pt-1">
                  <button
                    id="btn-start-amendment"
                    onClick={() => setIsAmending(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                    <span>Amend Entry (Audit Trail Protected)</span>
                  </button>
                </div>
              )}

              {/* INLINE AMENDMENT FORM */}
              {isAmending && (
                <form onSubmit={handleSaveAmendment} className="border-2 border-blue-400 bg-blue-50/40 rounded-xl p-3.5 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-blue-600" />
                      <span>Create Formal Amendment (Version {entry.version + 1})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAmending(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[11px] text-blue-900 leading-snug">
                    Approved entries cannot be silently edited. This correction will be permanently logged with your name, timestamp, and explanation.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Reason for Amendment <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="amendment-reason-input"
                        type="text"
                        required
                        placeholder="e.g. Adjusted final invoice total to reflect freight & sales tax"
                        value={amendReason}
                        onChange={(e) => setAmendReason(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={amendedTitle}
                        onChange={(e) => setAmendedTitle(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    {entry.amount !== undefined && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Amount ({entry.currency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={amendedAmount}
                          onChange={(e) => setAmendedAmount(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={amendedDescription}
                        onChange={(e) => setAmendedDescription(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="require-reapproval-check"
                        checked={requireReapproval}
                        onChange={(e) => setRequireReapproval(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="require-reapproval-check" className="text-slate-700 text-[11px] cursor-pointer">
                        Send back to partners for re-approval
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                    <button
                      type="button"
                      onClick={() => setIsAmending(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      id="save-amendment-btn"
                      type="submit"
                      className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                    >
                      Save Amendment & Log Audit
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* TAB 2: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800">
                Partner Discussion ({entry.comments.length})
              </div>

              {entry.comments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No comments yet. Start a discussion between partners.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {entry.comments.map((comm) => {
                    const author = partnerMap.get(comm.partnerId);
                    return (
                      <div key={comm.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <div
                              className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                              style={{ backgroundColor: author?.avatarColor || '#64748b' }}
                            >
                              {author?.name.charAt(0)}
                            </div>
                            <span>{author?.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(comm.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap pl-5">
                          {comm.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-2">
                <input
                  id="entry-comment-input"
                  type="text"
                  placeholder={`Comment as ${activePartner.name.split(' ')[0]}...`}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  id="send-comment-btn"
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="p-2 bg-emerald-600 disabled:opacity-50 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS & RECEIPTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Supporting Documents ({entry.attachments.length})
                </span>
                
                {/* Upload Button */}
                <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Attach File</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,application/pdf"
                  />
                </label>
              </div>

              {entry.attachments.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs text-slate-600 font-medium">No documents attached</div>
                  <div className="text-[11px] text-slate-400">
                    Attach receipts, bank transfer confirmation, or signed contracts.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {entry.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {att.fileType.startsWith('image/') ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(att.url)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0"
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 truncate">{att.name}</div>
                          <div className="text-[10px] text-slate-400">{att.sizeKb} KB • {formatDate(att.uploadedAt)}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(att.url)}
                        className="px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50 rounded flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-600" />
                <span>Audit & Amendment History</span>
              </div>

              <div className="border-l-2 border-slate-200 pl-3 space-y-4 text-xs ml-1">
                {/* Current Version */}
                <div className="relative">
                  <div className="absolute -left-[19px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <div className="font-semibold text-slate-800">
                    Current Version (v{entry.version})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Status: <strong className="capitalize">{entry.status}</strong> • Updated {formatDate(entry.updatedAt)}
                  </div>
                </div>

                {/* Amendments */}
                {entry.amendments.map((amen) => {
                  const partner = partnerMap.get(amen.amendedByPartnerId);
                  return (
                    <div key={amen.id} className="relative bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                      <div className="absolute -left-[19px] top-2.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-blue-900">
                          Amended to v{amen.version + 1}
                        </span>
                        <span className="text-slate-400">{formatRelativeTime(amen.timestamp)}</span>
                      </div>
                      <div className="text-slate-700 text-xs">
                        <strong>Reason:</strong> {amen.reason}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Amended by {partner?.name} • Changed: {amen.changedFields.join(', ')}
                      </div>
                      {amen.previousValues && (
                        <div className="text-[10px] bg-white p-1.5 rounded border border-slate-200 font-mono text-slate-600">
                          Prior amount: {amen.previousValues.amount ? formatCurrency(amen.previousValues.amount, entry.currency) : 'N/A'}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Original Creation Record */}
                <div className="relative">
                  <div className="absolute -left-[19px] top-0.5 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                  <div className="font-semibold text-slate-700">
                    Entry Created (v1)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Submitted by {creator?.name} on {formatDate(entry.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px] truncate">
            ID: <span className="font-mono">{entry.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>

      </div>

      {/* Lightbox / Full Receipt Preview */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 p-2 text-white bg-white/20 hover:bg-white/30 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImageUrl}
            alt="Receipt / Document Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
};
