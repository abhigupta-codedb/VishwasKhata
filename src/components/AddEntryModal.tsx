import React, { useState, useMemo } from 'react';
import { Project, Partner, LedgerEntry, EntryType, Attachment } from '../types';
import { getApprovalRequirement } from '../utils/approvalPolicy';
import { SETUP_CATEGORIES } from '../utils/storage';
import { 
  X, 
  Check, 
  Coins, 
  Building2, 
  CreditCard, 
  Scale, 
  FileText,
  UploadCloud, 
  Loader2, 
  Paperclip, 
  AlertCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { uploadEntryAttachment } from '../services/attachmentStorageService';

interface AddEntryModalProps {
  project: Project;
  activePartner: Partner;
  prefill?: Partial<LedgerEntry>;
  onClose: () => void;
  onSubmit: (entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'amendments' | 'votes' | 'comments' | 'status'> & { status: 'pending' | 'approved' }) => void;
}

const CONTRIBUTION_TYPES: { type: EntryType; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    type: 'capital_contribution',
    label: 'Core Equity Capital',
    sub: 'Permanent investment for agreed stake',
    icon: <Coins className="w-4 h-4 text-emerald-600" />,
  },
  {
    type: 'partner_loan',
    label: 'Founder Setup Advance',
    sub: 'Temporary advance for venture setup',
    icon: <Building2 className="w-4 h-4 text-indigo-600" />,
  },
  {
    type: 'personal_expense',
    label: 'Direct Setup Payment',
    sub: 'Paid vendor directly from personal account',
    icon: <CreditCard className="w-4 h-4 text-amber-600" />,
  },
  {
    type: 'decision',
    label: 'Partner Agreement',
    sub: 'Mutual vote on deed or setup terms',
    icon: <Scale className="w-4 h-4 text-purple-600" />,
  },
  {
    type: 'note',
    label: 'Setup Memo / Record',
    sub: 'Meeting notes, bank details, docs',
    icon: <FileText className="w-4 h-4 text-stone-600" />,
  },
];

const PAYMENT_MODES: ('NetBanking' | 'UPI' | 'Cheque' | 'Card' | 'Cash')[] = [
  'NetBanking',
  'UPI',
  'Cheque',
  'Card',
  'Cash'
];

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
  project,
  activePartner,
  prefill,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<EntryType>(prefill?.type || 'capital_contribution');
  const [title, setTitle] = useState(prefill?.title || '');
  const [amount, setAmount] = useState(prefill?.amount !== undefined ? String(prefill.amount) : '');
  const [category, setCategory] = useState(prefill?.category || SETUP_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [payerPartnerId, setPayerPartnerId] = useState(prefill?.payerPartnerId || activePartner.id);
  const [recipientPartnerId, setRecipientPartnerId] = useState(prefill?.recipientPartnerId || activePartner.id);
  const [paymentMethod, setPaymentMethod] = useState<'NetBanking' | 'UPI' | 'Cheque' | 'Card' | 'Cash'>('NetBanking');
  const [transferRef, setTransferRef] = useState('');

  // Attachments & upload state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isFinancial = ['capital_contribution', 'partner_loan', 'personal_expense', 'project_expense', 'reimbursement', 'withdrawal'].includes(type);

  // Mandatory Centralized Approval Requirement calculation
  const approvalRequirement = useMemo(() => {
    return getApprovalRequirement(project, {
      type,
      amount: isFinancial ? Number(amount) || 0 : undefined,
      createdByPartnerId: activePartner.id,
      payerPartnerId: ['capital_contribution', 'partner_loan', 'personal_expense'].includes(type) ? payerPartnerId : undefined,
    });
  }, [project, type, amount, activePartner.id, payerPartnerId, isFinancial]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploaded = await uploadEntryAttachment({
        file,
        projectId: project.id,
        entryId: 'new_entry',
        uploaderUid: activePartner.uid,
        isDemo: project.isDemo,
      });
      setAttachments((prev) => [...prev, uploaded]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    const numAmount = isFinancial ? parseFloat(amount) : undefined;
    if (isFinancial && (numAmount === undefined || isNaN(numAmount) || numAmount <= 0)) {
      return;
    }

    const initialStatus = approvalRequirement.level === 'none' ? 'approved' : 'pending';

    onSubmit({
      projectId: project.id,
      type,
      title: title.trim(),
      amount: numAmount,
      currency: project.currency,
      category,
      description: description.trim() || undefined,
      date,
      createdByPartnerId: activePartner.id,
      createdByUid: activePartner.uid,
      payerPartnerId: ['capital_contribution', 'partner_loan', 'personal_expense'].includes(type) ? payerPartnerId : undefined,
      recipientPartnerId: ['reimbursement', 'withdrawal'].includes(type) ? recipientPartnerId : undefined,
      paymentMethod: isFinancial ? paymentMethod : undefined,
      gstInvoice: transferRef.trim() || undefined,
      requiredApproverPartnerIds: approvalRequirement.requiredApproverPartnerIds,
      approvalRequirement: approvalRequirement.level,
      attachments,
      decisionOptions: type === 'decision' ? ['Approve', 'Reject'] : undefined,
      status: initialStatus,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-stone-900">Record Partner Contribution</h3>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                Setup Pool
              </span>
            </div>
            <p className="text-[11px] text-stone-500">Track money introduced into the venture setup ledger</p>
          </div>
          <button
            id="close-add-modal-btn"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          
          {/* Amount Introduced Field */}
          {isFinancial && (
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 text-center">
              <span className="text-[11px] font-medium text-stone-500 block">
                Amount Introduced into Venture ({project.currency} INR)
              </span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl font-bold text-stone-900">{project.currency}</span>
                <input
                  id="entry-amount-input"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-3xl font-bold text-stone-900 bg-transparent w-48 text-center focus:outline-none border-b-2 border-emerald-600"
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          {/* Contributing Partner Attribution */}
          {['capital_contribution', 'partner_loan', 'personal_expense'].includes(type) && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 block">
                Contributing Partner (किस साथी ने पैसा लगाया)
              </label>
              <select
                id="entry-payer-select"
                value={payerPartnerId}
                onChange={(e) => setPayerPartnerId(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none font-medium"
              >
                {project.partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role}) • {p.equityPercentage}% Agreed Stake
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contribution Structure / Type Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
              Contribution Nature (निवेश प्रकार)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {CONTRIBUTION_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setType(t.type)}
                  className={`p-2 rounded-xl text-left border transition-all flex items-start gap-2 ${
                    type === t.type
                      ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-semibold shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="p-1 bg-stone-100 rounded-lg flex-shrink-0 mt-0.5">
                    {t.icon}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold leading-tight">{t.label}</div>
                    <div className="text-[10px] text-stone-400 truncate">{t.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Setup Purpose / Why it was introduced */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-600 block">
              Setup Purpose / Title (पैसा क्यों लगाया गया) <span className="text-rose-500">*</span>
            </label>
            <input
              id="entry-title-input"
              type="text"
              placeholder="e.g. Initial seed capital wire, MCA incorporation fee, Office deposit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-emerald-600"
              required
            />
          </div>

          {/* Category (Setup Stage) and Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 block">
                Setup Category
              </label>
              <select
                id="entry-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
              >
                {SETUP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 block">
                Date Introduced
              </label>
              <input
                id="entry-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method & UTR / Transfer Reference */}
          {isFinancial && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">
                  Transfer Mode (भुगतान माध्यम)
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {PAYMENT_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMethod(mode)}
                      className={`py-1.5 text-center text-[10px] font-semibold rounded-lg border transition-all ${
                        paymentMethod === mode
                          ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">
                  UTR / Transfer Reference / Cheque No. (हस्तांतरण संदर्भ)
                </label>
                <input
                  id="entry-ref-input"
                  type="text"
                  placeholder="e.g. HDFC RTGS Ref #9812739182 / UPI Ref"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Notes / Details */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-600 block">
              Notes / Partner Memo (वैकल्पिक टिप्पणी)
            </label>
            <textarea
              id="entry-description-input"
              rows={2}
              placeholder="Any additional details agreed among partners regarding this contribution..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
            />
          </div>

          {/* Proof / Receipt Attachment */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-stone-600 block">
              Transfer Proof / Receipt (बैंक स्लिप या इनवॉइस)
            </label>

            <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-stone-50 hover:bg-stone-100/80 border border-dashed border-stone-300 rounded-xl cursor-pointer text-stone-700 font-medium transition-colors">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span>Uploading proof...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-stone-500" />
                  <span>Attach Bank Wire Confirmation / Receipt</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={isUploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadError && (
              <div className="text-[10px] text-rose-600 flex items-center gap-1 bg-rose-50 p-2 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {attachments.map((att, idx) => (
                  <span key={att.id} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[140px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="ml-1 text-emerald-600 hover:text-emerald-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Mutual Verification Policy Notice */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Mutual Partner Sign-Off Policy</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                Co-Partner Sign-Off
              </span>
            </div>

            <p className="text-[11px] text-stone-600 leading-snug">
              To guarantee transparency, other partners will review and sign off before this money is locked into the venture's official investment ledger.
            </p>
            {approvalRequirement.requiredApproverPartnerIds.length > 0 && (
              <div className="text-[10px] text-stone-500 pt-1 flex items-center gap-1 flex-wrap">
                <span>Sign-off required from:</span>
                {approvalRequirement.requiredApproverPartnerIds.map(pid => {
                  const p = project.partners.find(item => item.id === pid);
                  return (
                    <span key={pid} className="font-semibold text-stone-800 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                      {p?.name.split(' ')[0] || pid}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              id="submit-entry-btn"
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Record in Investment Ledger</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
