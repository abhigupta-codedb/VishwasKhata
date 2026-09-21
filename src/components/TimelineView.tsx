import React, { useState, useMemo } from 'react';
import { LedgerEntry, Partner, Project } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime,
  getEntryTypeMeta, 
  calculateProjectFinancials
} from '../utils/storage';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Coins, 
  Building2, 
  CreditCard,
  Receipt,
  Scale, 
  FileText,
  Paperclip,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  User,
  Layers
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

type FilterCategory = 'all' | 'capital' | 'advance' | 'direct' | 'pending';

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
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
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
        if (filterCategory === 'capital') {
          return e.type === 'capital_contribution';
        }
        if (filterCategory === 'advance') {
          return e.type === 'partner_loan';
        }
        if (filterCategory === 'direct') {
          return e.type === 'personal_expense';
        }
        if (filterCategory === 'pending') {
          return e.status === 'pending';
        }
        return true;
      })
      .filter(e => {
        if (selectedPartnerId === 'all') return true;
        const payer = e.payerPartnerId || e.createdByPartnerId;
        return payer === selectedPartnerId;
      })
      .filter(e => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const titleMatch = e.title.toLowerCase().includes(q);
        const descMatch = e.description?.toLowerCase().includes(q) || false;
        const catMatch = e.category?.toLowerCase().includes(q) || false;
        const creator = partnerMap.get(e.createdByPartnerId)?.name.toLowerCase() || '';
        const payer = e.payerPartnerId ? partnerMap.get(e.payerPartnerId)?.name.toLowerCase() || '' : '';
        return titleMatch || descMatch || catMatch || creator.includes(q) || payer.includes(q);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, project.id, filterCategory, selectedPartnerId, searchQuery, partnerMap]);

  // Clean icon helper for setup contributions
  const getContributionIcon = (type: LedgerEntry['type']) => {
    switch (type) {
      case 'capital_contribution':
        return <Coins className="w-4 h-4 text-emerald-600" />;
      case 'partner_loan':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case 'personal_expense':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'decision':
        return <Scale className="w-4 h-4 text-purple-600" />;
      case 'note':
        return <FileText className="w-4 h-4 text-stone-600" />;
      default:
        return <Coins className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="space-y-3.5 pb-28 max-w-md mx-auto px-4 pt-3.5">
      
      {/* Investment Ledger Header Card */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-sm border border-stone-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-stone-400 block tracking-wide">
                Total Capital Introduced (कुल पूंजी)
              </span>
              <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                Setup Phase
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white mt-1">
              {formatCurrency(financials.totalInvested, project.currency)}
            </div>
          </div>

          {pendingApprovalsCount > 0 ? (
            <button
              onClick={onNavigateToApprovals}
              className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-full text-right flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">
                {pendingApprovalsCount} to sign off
              </span>
            </button>
          ) : (
            <div className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full text-right flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">Mutually Verified</span>
            </div>
          )}
        </div>

        {/* Partner Contribution Summary Chips */}
        <div className="mt-3 pt-2.5 border-t border-stone-800/80 space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
            Partner Shares in Setup Pool:
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {project.partners.map((p) => {
              const summary = financials.partnerSummaries[p.id];
              const contributed = summary?.totalCashInjected || 0;
              const share = summary?.contributionShare || 0;

              return (
                <div
                  key={p.id}
                  className="bg-stone-800/90 border border-stone-700/80 rounded-lg px-2 py-1 text-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.avatarColor }}
                  />
                  <span className="font-medium text-stone-200">{p.name.split(' ')[0]}</span>
                  <span className="text-stone-400 font-mono text-[11px]">
                    {formatCurrency(contributed, project.currency)}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400">
                    ({share.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search & Partner Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            id="timeline-search-input"
            type="text"
            placeholder="Search contributions, purpose, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white text-xs text-stone-800 placeholder-stone-400 border border-stone-200 rounded-xl shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Filter by Contribution Type */}
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
            All ({entries.filter(e => e.projectId === project.id).length})
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
            Core Capital
          </button>

          <button
            id="filter-chip-advance"
            onClick={() => setFilterCategory('advance')}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              filterCategory === 'advance'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Setup Advances
          </button>

          <button
            id="filter-chip-direct"
            onClick={() => setFilterCategory('direct')}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              filterCategory === 'direct'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Direct Payments
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
            Pending Sign-off ({entries.filter(e => e.projectId === project.id && e.status === 'pending').length})
          </button>
        </div>

        {/* Filter by Contributing Partner */}
        <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5 no-scrollbar text-stone-500">
          <span className="font-medium text-stone-400 pl-1">Partner:</span>
          <button
            onClick={() => setSelectedPartnerId('all')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              selectedPartnerId === 'all'
                ? 'bg-stone-200 text-stone-900 font-semibold'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            All
          </button>
          {project.partners.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPartnerId(p.id)}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                selectedPartnerId === p.id
                  ? 'bg-stone-200 text-stone-900 font-semibold'
                  : 'hover:bg-stone-100 text-stone-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.avatarColor }} />
              <span>{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Investment Contributions List */}
      <div className="space-y-2.5">
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3 shadow-2xs">
            <Coins className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500">
              {searchQuery ? `No records found for "${searchQuery}"` : 'No contributions recorded in this filter.'}
            </p>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Contribution</span>
            </button>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const payer = entry.payerPartnerId ? partnerMap.get(entry.payerPartnerId) : null;
            const creator = partnerMap.get(entry.createdByPartnerId);
            const contributingPartner = payer || creator;
            const typeMeta = getEntryTypeMeta(entry.type);

            const isSignerNeeded = entry.status === 'pending' && 
              entry.requiredApproverPartnerIds.includes(activePartner.id) &&
              !entry.votes.some(v => v.partnerId === activePartner.id && v.decision !== 'pending');

            return (
              <div
                key={entry.id}
                id={`timeline-entry-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className="group bg-white hover:bg-stone-50/90 active:bg-stone-100 border border-stone-200/90 rounded-xl p-3.5 cursor-pointer transition-all shadow-2xs space-y-2.5"
              >
                {/* Card Top: Contributor + Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs flex-shrink-0"
                      style={{ backgroundColor: contributingPartner?.avatarColor || '#059669' }}
                    >
                      {contributingPartner?.name.charAt(0) || 'P'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {contributingPartner?.name || 'Partner'}
                        </span>
                        {contributingPartner?.id === activePartner.id && (
                          <span className="text-[9px] bg-stone-100 text-stone-600 px-1 rounded font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1">
                        <span>{formatDate(entry.date)}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(entry.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount Introduced */}
                  <div className="text-right flex-shrink-0">
                    {entry.amount !== undefined ? (
                      <div className="text-sm font-extrabold text-stone-900 tracking-tight">
                        +{formatCurrency(entry.amount, entry.currency)}
                      </div>
                    ) : (
                      <div className="text-xs text-stone-500 font-medium">Decision</div>
                    )}
                    <div className="text-[10px] text-emerald-700 font-medium">
                      {typeMeta.shortLabel}
                    </div>
                  </div>
                </div>

                {/* Card Middle: Setup Purpose & Details (The "Why" it was introduced) */}
                <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-100/90 space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {entry.title}
                    </span>
                    {entry.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200 flex-shrink-0">
                        <Paperclip className="w-3 h-3 text-stone-400" />
                        <span>Proof</span>
                      </span>
                    )}
                  </div>

                  {entry.category && (
                    <div className="text-[11px] text-stone-500 flex items-center gap-1">
                      <span className="font-medium text-stone-600">{entry.category}</span>
                      {entry.paymentMethod && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span>Via {entry.paymentMethod}</span>
                        </>
                      )}
                    </div>
                  )}

                  {entry.description && (
                    <p className="text-[11px] text-stone-500 line-clamp-1 italic">
                      "{entry.description}"
                    </p>
                  )}
                </div>

                {/* Card Bottom: Mutual Sign-off Status */}
                <div className="flex items-center justify-between pt-0.5 text-[11px]">
                  <div>
                    {entry.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Mutually Approved</span>
                      </span>
                    )}
                    {entry.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>
                          Sign-off in progress ({entry.votes.filter(v => v.decision === 'approved').length}/{entry.requiredApproverPartnerIds.length})
                        </span>
                      </span>
                    )}
                    {entry.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  {isSignerNeeded ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>Needs your sign-off</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400 group-hover:text-stone-600 flex items-center gap-0.5">
                      <span>View record</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
