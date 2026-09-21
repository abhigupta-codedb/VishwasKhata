import React from 'react';
import { Project, LedgerEntry, Partner } from '../types';
import { 
  calculateProjectFinancials, 
  formatCurrency, 
  PartnerFinancialSummary 
} from '../utils/storage';
import { 
  Download, 
  Coins, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  ChevronRight,
  Clock,
  ShieldCheck,
  TrendingUp,
  Percent,
  Layers,
  Sparkles
} from 'lucide-react';

interface MoneyViewProps {
  project: Project;
  entries: LedgerEntry[];
  activePartner: Partner;
  onOpenReimburseModal?: (partnerId: string, amount: number) => void;
  onNavigateToApprovals: () => void;
}

export const MoneyView: React.FC<MoneyViewProps> = ({
  project,
  entries,
  activePartner,
  onOpenReimburseModal,
  onNavigateToApprovals,
}) => {
  const financials = calculateProjectFinancials(project, entries);

  const handleExportCSV = () => {
    const projectEntries = entries.filter(e => e.projectId === project.id);
    const headers = [
      'ID', 
      'Date Introduced', 
      'Contribution Type', 
      'Purpose / Title', 
      'Setup Category', 
      'Amount (INR)', 
      'Payment Mode', 
      'Contributing Partner', 
      'Sign-off Status'
    ];
    const rows = projectEntries.map(e => [
      e.id,
      e.date,
      e.type,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${(e.category || 'General Setup').replace(/"/g, '""')}"`,
      e.amount !== undefined ? e.amount : '',
      e.paymentMethod || 'NetBanking',
      project.partners.find(p => p.id === (e.payerPartnerId || e.createdByPartnerId))?.name || '',
      e.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_Investment_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto px-4 pt-3.5">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-stone-900">Capital Pool (पूंजी निवेश)</h2>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded-full">
              Setup Phase
            </span>
          </div>
          <p className="text-xs text-stone-500">Shared investment ledger for venture establishment</p>
        </div>
        <button
          id="export-csv-btn"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Main Seed Capital Card - Clean, High Contrast & Authoritative */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-sm border border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-stone-400 block tracking-wide">
            Total Money Introduced into Venture (कुल निवेश)
          </span>
          <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Pre-Revenue
          </span>
        </div>

        <div className="text-3xl font-bold tracking-tight text-white mt-1.5">
          {formatCurrency(financials.totalInvested, project.currency)}
        </div>
        <div className="text-[11px] text-stone-400 mt-0.5">
          Cumulative seed capital contributed by partners during business setup
        </div>

        {/* 3 Key Capital Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-3.5 mt-3.5 border-t border-stone-800 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 block">Verified Pool</span>
            <span className="font-bold text-emerald-400">
              {formatCurrency(financials.approvedInvested, project.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block">Pending Sign-off</span>
            <span className="font-bold text-amber-400">
              {formatCurrency(financials.pendingInvested, project.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block">Contributions</span>
            <span className="font-bold text-stone-100">
              {financials.contributionsCount} records
            </span>
          </div>
        </div>
      </div>

      {/* Pending Approvals Notice if any */}
      {financials.pendingApprovalsCount > 0 && (
        <div 
          onClick={onNavigateToApprovals}
          className="bg-amber-50 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                {formatCurrency(financials.pendingApprovalsValue, project.currency)} awaiting partner sign-off
              </div>
              <div className="text-[11px] text-amber-700">
                {financials.pendingApprovalsCount} new contributions need mutual verification
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600" />
        </div>
      )}

      {/* Partner Contributions & Agreed Equity Comparison */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>Partner Contributions & Equity (साझेदार हिस्सेदारी)</span>
          </h3>
          <span className="text-[10px] text-stone-400">
            Funded % vs Agreed %
          </span>
        </div>

        <div className="space-y-2.5">
          {Object.values(financials.partnerSummaries).map((summary) => {
            const partner = project.partners.find(p => p.id === summary.partnerId);
            if (!partner) return null;

            const isAhead = summary.equityDelta >= 0;

            return (
              <div
                key={summary.partnerId}
                id={`partner-card-${summary.partnerId}`}
                className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-2xs space-y-3"
              >
                {/* Partner Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                      style={{ backgroundColor: partner.avatarColor }}
                    >
                      {partner.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{partner.name}</span>
                        {summary.partnerId === activePartner.id && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.2 rounded font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {partner.role} • {partner.equityPercentage}% Agreed Stake
                      </div>
                    </div>
                  </div>

                  {/* Total Contributed by Partner */}
                  <div className="text-right">
                    <div className="text-xs font-bold text-stone-900">
                      {formatCurrency(summary.totalCashInjected, project.currency)}
                    </div>
                    <div className="text-[10px] font-medium text-emerald-700">
                      {summary.contributionShare.toFixed(1)}% of seed pool
                    </div>
                  </div>
                </div>

                {/* Progress / Ratio Bar comparing Contributed % vs Agreed % */}
                <div className="space-y-1 bg-stone-50 rounded-lg p-2 border border-stone-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-600 font-medium">Capital Contribution Ratio</span>
                    <span className={`text-[10px] font-semibold ${isAhead ? 'text-emerald-700' : 'text-stone-500'}`}>
                      {summary.contributionShare.toFixed(1)}% funded / {partner.equityPercentage}% agreed
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-2 relative overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, summary.contributionShare)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-stone-400 pt-0.5">
                    <span>
                      {summary.contributionCount} contribution{summary.contributionCount === 1 ? '' : 's'} recorded
                    </span>
                    <span>
                      {summary.latestContributionDate ? `Last: ${summary.latestContributionDate}` : 'No contributions yet'}
                    </span>
                  </div>
                </div>

                {/* Contribution Breakdown: Core Capital vs Setup Advance vs Direct Outlay */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-stone-100">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Core Equity</span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(summary.capitalContributed, project.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Founder Advance</span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(summary.loansProvided, project.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Direct Setup Paid</span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(summary.personalExpensesPaid, project.currency)}
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Why Money Was Introduced: Setup Purpose Breakdown */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-stone-600" />
            <span>Setup Purpose Allocation (पैसा क्यों लगाया गया)</span>
          </h3>
          <span className="text-[10px] text-stone-400">
            {financials.purposeBreakdown.length} Categories
          </span>
        </div>

        {financials.purposeBreakdown.length === 0 ? (
          <div className="text-center py-4 text-xs text-stone-400">
            No categorized setup contributions yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {financials.purposeBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-800 truncate max-w-[200px]">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-stone-900">
                      {formatCurrency(item.amount, project.currency)}
                    </span>
                    <span className="text-[10px] text-stone-400 w-10 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-stone-800 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transparency Guarantee Note */}
      <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>One Mutually Approved Source of Truth</span>
        </div>
        <p className="text-[11px] text-emerald-800 leading-relaxed">
          Every contribution introduced into this setup ledger is verified by co-partners. 
          This guarantees a transparent, dispute-free record of who invested what to establish the venture.
        </p>
      </div>

    </div>
  );
};
