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
  ArrowDownLeft, 
  CheckCircle2, 
  ChevronRight,
  Clock
} from 'lucide-react';

interface MoneyViewProps {
  project: Project;
  entries: LedgerEntry[];
  activePartner: Partner;
  onOpenReimburseModal: (partnerId: string, amount: number) => void;
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
    const headers = ['ID', 'Date', 'Type', 'Title', 'Category', 'Amount (INR)', 'Payment Mode', 'Status', 'Partner'];
    const rows = projectEntries.map(e => [
      e.id,
      e.date,
      e.type,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      e.amount !== undefined ? e.amount : '',
      e.paymentMethod || 'NetBanking',
      e.status,
      project.partners.find(p => p.id === (e.payerPartnerId || e.createdByPartnerId))?.name || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_Hisaab_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto px-4 pt-3.5">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-900">Hisaab & Balances (हिसाब)</h2>
          <p className="text-xs text-stone-500">Shared treasury & partner capital accounts</p>
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

      {/* Main Treasury Card - Clean & Focused */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-sm border border-stone-800">
        <span className="text-[11px] font-medium text-stone-400 block tracking-wide">
          Available Business Balance (कुल कोष)
        </span>
        <div className="text-3xl font-bold tracking-tight text-emerald-400 mt-1">
          {formatCurrency(financials.availableFunds, project.currency)}
        </div>
        <div className="text-[11px] text-stone-400 mt-1">
          Net current balance in company current account
        </div>

        {/* 2 Key Inflow/Outflow Numbers */}
        <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-stone-800 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 block">Total Inflow (पूंजी + आय)</span>
            <span className="font-bold text-stone-100">
              {formatCurrency(financials.totalInflow, project.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block">Total Outflow (खर्च + निकासी)</span>
            <span className="font-bold text-stone-100">
              {formatCurrency(financials.totalOutflow, project.currency)}
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
                {formatCurrency(financials.pendingApprovalsValue, project.currency)} awaiting partner approval
              </div>
              <div className="text-[11px] text-amber-700">
                {financials.pendingApprovalsCount} entries need sign-off
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600" />
        </div>
      )}

      {/* Partner Balances (The Core Hisaab) */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Partner Accounts (साझेदार हिसाब)
        </h3>

        <div className="space-y-2">
          {Object.values(financials.partnerSummaries).map((summary) => {
            const partner = project.partners.find(p => p.id === summary.partnerId);
            if (!partner) return null;

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
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                      style={{ backgroundColor: partner.avatarColor }}
                    >
                      {partner.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{partner.name}</span>
                        {summary.partnerId === activePartner.id && (
                          <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {partner.role} • {partner.equityPercentage}% Equity
                      </div>
                    </div>
                  </div>

                  {/* Net Status Badge */}
                  <div>
                    {summary.reimbursementPending > 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Owed {formatCurrency(summary.reimbursementPending, project.currency)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                        Settled
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-Ledger: Capital, Loans, Out-of-pocket */}
                <div className="grid grid-cols-3 gap-2 bg-stone-50 rounded-lg p-2.5 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Capital (पूंजी)</span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(summary.capitalContributed, project.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Loan (ऋण)</span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(summary.loansProvided, project.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Own Pocket</span>
                    <span className="font-semibold text-stone-800">
                      {formatCurrency(summary.personalExpensesPaid, project.currency)}
                    </span>
                  </div>
                </div>

                {/* Settle Action */}
                {summary.reimbursementPending > 0 && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-stone-500">
                      Pending reimbursement from company
                    </span>
                    <button
                      id={`reimburse-partner-${summary.partnerId}`}
                      onClick={() => onOpenReimburseModal(summary.partnerId, summary.reimbursementPending)}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                    >
                      Settle via UPI / IMPS
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown by Money Type - Minimal Table */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-2xs space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Separate Money Types Summary
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-stone-100">
            <div className="flex items-center gap-2 text-stone-700">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>Partner Capital (Equity)</span>
            </div>
            <span className="font-bold text-stone-900">
              {formatCurrency(financials.totalCapitalContributed, project.currency)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100">
            <div className="flex items-center gap-2 text-stone-700">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Partner Loans (Debt)</span>
            </div>
            <span className="font-bold text-stone-900">
              {formatCurrency(financials.totalLoansProvided, project.currency)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100">
            <div className="flex items-center gap-2 text-stone-700">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Personally Paid Expenses</span>
            </div>
            <span className="font-bold text-stone-900">
              {formatCurrency(financials.totalPersonalExpensesApproved, project.currency)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 text-stone-700">
              <ArrowDownLeft className="w-4 h-4 text-teal-600" />
              <span>Reimbursements Settled</span>
            </div>
            <span className="font-bold text-stone-900">
              {formatCurrency(financials.totalReimbursementsPaid, project.currency)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
