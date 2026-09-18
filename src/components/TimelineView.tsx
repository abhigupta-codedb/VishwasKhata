import React, { useState, useMemo } from 'react';
import { LedgerEntry, Partner, Project } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  getEntryTypeMeta, 
  getApprovalStatusMeta,
  calculateProjectFinancials
} from '../utils/storage';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Coins, 
  Building2, 
  Scale, 
  FileText,
  CreditCard,
  Paperclip,
  MessageSquare,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface TimelineViewProps {
  entries: LedgerEntry[];
  project: Project;
  activePartner: Partner;
  availableFunds: number;
  pendingApprovalsCount: number;
  onSelectEntry: (entry: LedgerEntry) => void;
  onOpenAddModal: () => void;
  onNavigateToApprovals?: () => void;
}

type FilterCategory = 'all' | 'expenses' | 'capital' | 'pending';

export const TimelineView: React.FC<TimelineViewProps> = ({
  entries,
  project,
  activePartner,
  availableFunds,
  pendingApprovalsCount,
  onSelectEntry,
  onOpenAddModal,
  onNavigateToApprovals,
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const partnerMap = useMemo(() => new Map(project.partners.map(p => [p.id, p])), [project.partners]);
  const financials = useMemo(() => calculateProjectFinancials(project, entries), [project, entries]);
  const activePartnerSummary = useMemo(() => {
    return financials.partnerSummaries[activePartner.id];
  }, [financials, activePartner.id]);

  // Filter entries for this project
  const filteredEntries = useMemo(() => {
    return entries
      .filter(e => e.projectId === project.id)
      .filter(e => {
        if (filterCategory === 'expenses') {
          return ['personal_expense', 'project_expense'].includes(e.type);
        }
        if (filterCategory === 'capital') {
          return ['capital_contribution', 'partner_loan', 'reimbursement', 'withdrawal'].includes(e.type);
        }
        if (filterCategory === 'pending') {
          return e.status === 'pending';
        }
        return true;
      })
      .filter(e => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const titleMatch = e.title.toLowerCase().includes(q);
        const descMatch = e.description?.toLowerCase().includes(q) || false;
        const catMatch = e.category?.toLowerCase().includes(q) || false;
        const creator = partnerMap.get(e.createdByPartnerId)?.name.toLowerCase() || '';
        return titleMatch || descMatch || catMatch || creator.includes(q);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, project.id, filterCategory, searchQuery, partnerMap]);

  // Helper for type icon
  const getCleanIcon = (type: LedgerEntry['type']) => {
    switch (type) {
      case 'capital_contribution':
        return <Coins className="w-4 h-4 text-emerald-600" />;
      case 'personal_expense':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'project_expense':
        return <Receipt className="w-4 h-4 text-rose-600" />;
      case 'partner_loan':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case 'reimbursement':
        return <ArrowDownLeft className="w-4 h-4 text-teal-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-orange-600" />;
      case 'decision':
        return <Scale className="w-4 h-4 text-purple-600" />;
      case 'note':
        return <FileText className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="space-y-3.5 pb-28 max-w-md mx-auto px-4 pt-3.5">
      
      {/* Essential Minimalist Hisaab Card */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-sm border border-stone-800">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-medium text-stone-400 block tracking-wide">
              Company Balance (खाता बैलेंस)
            </span>
            <div className="text-2xl font-bold tracking-tight text-white mt-1">
              {formatCurrency(availableFunds, project.currency)}
            </div>
          </div>

          {pendingApprovalsCount > 0 ? (
            <button
              onClick={onNavigateToApprovals}
              className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-full text-right flex items-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">
                {pendingApprovalsCount} pending
              </span>
            </button>
          ) : (
            <div className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full text-right flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">All in sync</span>
            </div>
          )}
        </div>

        {/* Essential Partner Line */}
        <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between text-xs">
          <div className="text-stone-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>
              {activePartnerSummary && activePartnerSummary.reimbursementPending > 0
                ? `Company owes you ${formatCurrency(activePartnerSummary.reimbursementPending, project.currency)}`
                : 'All your personal expenses settled'}
            </span>
          </div>
          <span className="text-[11px] text-stone-400">
            Equity: {activePartner.equityPercentage}%
          </span>
        </div>
      </div>

      {/* Search & Simple Filter Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            id="timeline-search-input"
            type="text"
            placeholder="Search entries, partners, bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white text-xs text-stone-800 placeholder-stone-400 border border-stone-200 rounded-xl shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Minimal Necessary Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          <button
            id="filter-chip-all"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              filterCategory === 'all'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            All
          </button>
          
          <button
            id="filter-chip-expenses"
            onClick={() => setFilterCategory('expenses')}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              filterCategory === 'expenses'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Expenses (खर्च)
          </button>

          <button
            id="filter-chip-capital"
            onClick={() => setFilterCategory('capital')}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              filterCategory === 'capital'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Capital & Loans (पूंजी)
          </button>

          <button
            id="filter-chip-pending"
            onClick={() => setFilterCategory('pending')}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              filterCategory === 'pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white border border-stone-200 text-amber-800 hover:bg-amber-50'
            }`}
          >
            Approvals ({entries.filter(e => e.projectId === project.id && e.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Clean, Airy Timeline List */}
      <div className="space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3 shadow-2xs">
            <p className="text-xs text-stone-500">
              {searchQuery ? `No records found for "${searchQuery}"` : 'No entries yet in this category.'}
            </p>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Entry</span>
            </button>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const typeMeta = getEntryTypeMeta(entry.type);
            const payer = entry.payerPartnerId ? partnerMap.get(entry.payerPartnerId) : null;
            const creator = partnerMap.get(entry.createdByPartnerId);

            return (
              <div
                key={entry.id}
                id={`timeline-entry-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className="group bg-white hover:bg-stone-50/90 active:bg-stone-100 border border-stone-200/90 rounded-xl p-3 cursor-pointer transition-all shadow-2xs flex items-center justify-between gap-3"
              >
                {/* Left: Clean Icon & Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    {getCleanIcon(entry.type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors truncate">
                        {entry.title}
                      </h4>
                      {entry.attachments.length > 0 && (
                        <Paperclip className="w-3 h-3 text-stone-400 flex-shrink-0" />
                      )}
                    </div>

                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span>{payer?.name.split(' ')[0] || creator?.name.split(' ')[0] || 'Partner'}</span>
                      <span className="text-stone-300">•</span>
                      <span>{formatDate(entry.date)}</span>
                      {entry.paymentMethod && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className="font-medium text-stone-600">{entry.paymentMethod}</span>
                        </>
                      )}
                      {entry.version > 1 && (
                        <span className="text-[9px] px-1 bg-stone-100 text-stone-600 rounded">
                          v{entry.version}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Clean Status */}
                <div className="text-right flex-shrink-0">
                  {entry.amount !== undefined ? (
                    <div className="text-xs font-bold text-stone-900">
                      {formatCurrency(entry.amount, entry.currency)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-500 font-medium">Decision</div>
                  )}

                  <div className="mt-0.5">
                    {entry.status === 'approved' && (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                        Approved
                      </span>
                    )}
                    {entry.status === 'pending' && (
                      <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                        Pending
                      </span>
                    )}
                    {entry.status === 'rejected' && (
                      <span className="text-[10px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/60">
                        Rejected
                      </span>
                    )}
                    {entry.status === 'amended' && (
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                        Amended
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
