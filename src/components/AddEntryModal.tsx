import React, { useState } from 'react';
import { EntryType, LedgerEntry, Partner, Project } from '../types';
import { 
  X, 
  Coins, 
  Building2, 
  CreditCard, 
  Receipt, 
  Scale, 
  FileText, 
  UploadCloud, 
  Check, 
  Paperclip,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface AddEntryModalProps {
  project: Project;
  activePartner: Partner;
  prefill?: {
    type?: EntryType;
    recipientPartnerId?: string;
    payerPartnerId?: string;
    amount?: number;
    title?: string;
    category?: string;
  };
  onClose: () => void;
  onSubmit: (entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'amendments' | 'votes' | 'comments' | 'status'>) => void;
}

const ENTRY_TYPES: { type: EntryType; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    type: 'personal_expense',
    label: 'Paid from Pocket',
    sub: 'Own money, need reimbursement',
    icon: <CreditCard className="w-4 h-4 text-amber-600" />,
  },
  {
    type: 'project_expense',
    label: 'Company Expense',
    sub: 'Paid from business account',
    icon: <Receipt className="w-4 h-4 text-rose-600" />,
  },
  {
    type: 'capital_contribution',
    label: 'Partner Capital',
    sub: 'Poonji / Equity wire',
    icon: <Coins className="w-4 h-4 text-emerald-600" />,
  },
  {
    type: 'partner_loan',
    label: 'Partner Loan',
    sub: 'Temporary debt to venture',
    icon: <Building2 className="w-4 h-4 text-indigo-600" />,
  },
  {
    type: 'reimbursement',
    label: 'Reimbursement',
    sub: 'Repay partner expenses',
    icon: <ArrowDownLeft className="w-4 h-4 text-teal-600" />,
  },
  {
    type: 'withdrawal',
    label: 'Profit Draw',
    sub: 'Partner distribution',
    icon: <ArrowUpRight className="w-4 h-4 text-orange-600" />,
  },
  {
    type: 'decision',
    label: 'Partner Decision',
    sub: 'Vote / Strategy approval',
    icon: <Scale className="w-4 h-4 text-purple-600" />,
  },
  {
    type: 'note',
    label: 'Note / Memo',
    sub: 'Meeting notes, agreements',
    icon: <FileText className="w-4 h-4 text-stone-600" />,
  },
];

const CATEGORIES = [
  'Office & Rent',
  'Hardware & Tech',
  'Software & SaaS',
  'CA & Legal / GST',
  'Food & Pantry',
  'Marketing & Ads',
  'Travel & Cab',
  'Equity / Capital',
  'Partner Loan',
  'General',
];

const PAYMENT_MODES: ('UPI' | 'NetBanking' | 'Card' | 'Cash' | 'Cheque')[] = [
  'UPI',
  'NetBanking',
  'Card',
  'Cash',
  'Cheque'
];

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
  project,
  activePartner,
  prefill,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<EntryType>(prefill?.type || 'personal_expense');
  const [title, setTitle] = useState(prefill?.title || '');
  const [amount, setAmount] = useState(prefill?.amount !== undefined ? String(prefill.amount) : '');
  const [category, setCategory] = useState(prefill?.category || 'General');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [payerPartnerId, setPayerPartnerId] = useState(prefill?.payerPartnerId || activePartner.id);
  const [recipientPartnerId, setRecipientPartnerId] = useState(prefill?.recipientPartnerId || activePartner.id);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NetBanking' | 'Card' | 'Cash' | 'Cheque'>('UPI');
  const [gstInvoice, setGstInvoice] = useState('');

  // Approvers
  const otherPartnerIds = project.partners.filter(p => p.id !== activePartner.id).map(p => p.id);
  const [requiresApproval, setRequiresApproval] = useState(true);

  // Attachments
  const [attachments, setAttachments] = useState<{ id: string; name: string; fileType: string; url: string; sizeKb: number; uploadedAt: string }[]>([]);

  const isFinancial = ['capital_contribution', 'partner_loan', 'personal_expense', 'project_expense', 'reimbursement', 'withdrawal'].includes(type);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachments(prev => [
        ...prev,
        {
          id: `att_${Date.now()}`,
          name: file.name,
          fileType: file.type || 'application/octet-stream',
          url: reader.result as string,
          sizeKb: Math.round(file.size / 1024),
          uploadedAt: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a short description or title.');
      return;
    }

    if (isFinancial && (!amount || Number(amount) <= 0)) {
      alert('Please enter an amount.');
      return;
    }

    const approvers = requiresApproval ? otherPartnerIds : [];

    onSubmit({
      projectId: project.id,
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      amount: isFinancial ? Number(amount) : undefined,
      currency: project.currency,
      date,
      createdByPartnerId: activePartner.id,
      payerPartnerId: ['capital_contribution', 'partner_loan', 'personal_expense'].includes(type) ? payerPartnerId : undefined,
      recipientPartnerId: ['reimbursement', 'withdrawal'].includes(type) ? recipientPartnerId : undefined,
      paymentMethod: isFinancial ? paymentMethod : undefined,
      gstInvoice: gstInvoice.trim() || undefined,
      requiredApproverPartnerIds: approvers,
      attachments,
      decisionOptions: type === 'decision' ? ['Approve', 'Reject'] : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="text-sm font-bold text-stone-900">New Entry (नया खाता प्रविष्टि)</h3>
            <p className="text-[11px] text-stone-500">Shared with all partners</p>
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
          
          {/* Big Indian Rupee Amount Field */}
          {isFinancial && (
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 text-center">
              <span className="text-[11px] font-medium text-stone-500 block">
                Amount ({project.currency} INR)
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
                  className="text-3xl font-bold text-stone-900 bg-transparent w-44 text-center focus:outline-none border-b-2 border-emerald-600"
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          {/* Type Selector (Pills) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
              Entry Type (प्रकार)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ENTRY_TYPES.map((t) => (
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
                  <div className="mt-0.5">{t.icon}</div>
                  <div className="min-w-0">
                    <div className="text-xs truncate">{t.label}</div>
                    <div className="text-[10px] text-stone-400 truncate">{t.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title / For What */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-600 block">
              What is this for? (शीर्षक)
            </label>
            <input
              id="entry-title-input"
              type="text"
              placeholder="e.g. Indiranagar Coworking Rent, AWS Server Bill, Client Lunch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Payment Method & Paid By (If financial) */}
          {isFinancial && (
            <div className="grid grid-cols-2 gap-3">
              {/* Payment Mode */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">
                  Payment Mode (माध्यम)
                </label>
                <select
                  id="entry-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
                >
                  {PAYMENT_MODES.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              {/* Paid By / Recipient */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">
                  {type === 'reimbursement' ? 'Recipient Partner' : 'Paid By'}
                </label>
                <select
                  id="entry-payer-partner"
                  value={type === 'reimbursement' ? recipientPartnerId : payerPartnerId}
                  onChange={(e) => {
                    if (type === 'reimbursement') setRecipientPartnerId(e.target.value);
                    else setPayerPartnerId(e.target.value);
                  }}
                  className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
                >
                  {project.partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 block">
                Category
              </label>
              <select
                id="entry-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 block">
                Date
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

          {/* Optional GST Invoice & Receipt */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-stone-600 block">
                Bill / Receipt & GST (वैकल्पिक)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                id="entry-gst-input"
                type="text"
                placeholder="GSTIN / Bill Number"
                value={gstInvoice}
                onChange={(e) => setGstInvoice(e.target.value)}
                className="px-2.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
              />

              {/* Upload button */}
              <label className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-stone-100 hover:bg-stone-200/70 border border-stone-200 rounded-xl cursor-pointer text-stone-700 font-medium transition-colors">
                <UploadCloud className="w-4 h-4 text-stone-500" />
                <span>Attach Receipt</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {attachments.map((att, idx) => (
                  <span key={att.id} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{att.name}</span>
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

          {/* Simple Approval Toggle */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-stone-800 block">
                Partner Approval Required?
              </span>
              <span className="text-[10px] text-stone-400">
                Sends approval requests to all co-partners
              </span>
            </div>
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-stone-300"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              id="submit-entry-btn"
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Record in Khata (खाते में दर्ज करें)</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
