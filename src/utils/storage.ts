import { Project, LedgerEntry, AuditLogItem, Partner, EntryType, ApprovalStatus } from '../types';
import { INITIAL_PROJECTS, INITIAL_ENTRIES, INITIAL_AUDIT_LOG } from '../data/initialData';

const STORAGE_KEY_PROJECTS = 'partner_ledger_projects_in_v2';
const STORAGE_KEY_ENTRIES = 'partner_ledger_entries_in_v2';
const STORAGE_KEY_AUDIT = 'partner_ledger_audit_in_v2';
const STORAGE_KEY_ACTIVE_PROJ = 'partner_ledger_active_project_id_in_v2';
const STORAGE_KEY_ACTIVE_PARTNER = 'partner_ledger_active_partner_id_in_v2';

export function loadStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load projects from storage', e);
  }
  return INITIAL_PROJECTS;
}

export function saveStoredProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to storage', e);
  }
}

export function loadStoredEntries(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load entries from storage', e);
  }
  return INITIAL_ENTRIES;
}

export function saveStoredEntries(entries: LedgerEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save entries to storage', e);
  }
}

export function loadStoredAuditLog(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load audit log from storage', e);
  }
  return INITIAL_AUDIT_LOG;
}

export function saveStoredAuditLog(logs: AuditLogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save audit log to storage', e);
  }
}

export function loadActiveProjectId(projects: Project[]): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJ);
    if (saved && projects.some(p => p.id === saved)) return saved;
  } catch (e) {
    console.error('Error reading active project', e);
  }
  return projects[0]?.id || '';
}

export function saveActiveProjectId(id: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_PROJ, id);
}

export function loadActivePartnerId(partners: Partner[]): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_PARTNER);
    if (saved && partners.some(p => p.id === saved)) return saved;
  } catch (e) {
    console.error('Error reading active partner', e);
  }
  return partners[0]?.id || '';
}

export function saveActivePartnerId(id: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_PARTNER, id);
}

export function resetToDemoData(): {
  projects: Project[];
  entries: LedgerEntry[];
  auditLog: AuditLogItem[];
  activeProjectId: string;
  activePartnerId: string;
} {
  localStorage.removeItem(STORAGE_KEY_PROJECTS);
  localStorage.removeItem(STORAGE_KEY_ENTRIES);
  localStorage.removeItem(STORAGE_KEY_AUDIT);
  localStorage.removeItem(STORAGE_KEY_ACTIVE_PROJ);
  localStorage.removeItem(STORAGE_KEY_ACTIVE_PARTNER);

  const projects = INITIAL_PROJECTS;
  const entries = INITIAL_ENTRIES;
  const auditLog = INITIAL_AUDIT_LOG;
  const activeProjectId = projects[0].id;
  const activePartnerId = projects[0].partners[0].id;

  saveStoredProjects(projects);
  saveStoredEntries(entries);
  saveStoredAuditLog(auditLog);
  saveActiveProjectId(activeProjectId);
  saveActivePartnerId(activePartnerId);

  return { projects, entries, auditLog, activeProjectId, activePartnerId };
}

// ---------------- Money & Balance Calculations ---------------- //

export interface PartnerFinancialSummary {
  partnerId: string;
  name: string;
  role: string;
  equityPercentage: number;
  avatarColor: string;
  capitalContributed: number;
  loansProvided: number;
  loansRepaid: number;
  netLoanOutstanding: number;
  personalExpensesPaid: number;
  personalExpensesReimbursed: number;
  reimbursementPending: number;
  withdrawalsTaken: number;
  totalCashInjected: number; // total money introduced into venture
  contributionShare: number; // % of total money introduced by this partner
  equityDelta: number; // contributionShare - equityPercentage
  contributionCount: number;
  latestContributionDate: string | null;
  netReceivableFromProject: number; // pending reimbursement + net loans outstanding
}

export interface SetupPurposeItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ProjectFinancialSummary {
  availableFunds: number; // Project checking balance
  totalInvested: number; // Total money introduced into the business venture
  approvedInvested: number;
  pendingInvested: number;
  contributionsCount: number;
  totalCapitalContributed: number;
  totalLoansProvided: number;
  totalInflow: number; // capital + loans
  totalProjectExpensesPaid: number;
  totalPersonalExpensesApproved: number;
  totalReimbursementsPaid: number;
  totalWithdrawals: number;
  totalOutflow: number; // project expenses + reimbursements + withdrawals
  totalPendingReimbursements: number;
  pendingApprovalsValue: number;
  pendingApprovalsCount: number;
  purposeBreakdown: SetupPurposeItem[];
  partnerSummaries: Record<string, PartnerFinancialSummary>;
}

export const SETUP_CATEGORIES = [
  'Entity Incorporation & Legal',
  'Equipment, Tools & Machinery',
  'Workspace & Lease Deposit',
  'Tech Stack, Domains & Software',
  'Brand, Trademark & Design',
  'Initial Inventory & Materials',
  'Licenses, Permits & Compliance',
  'Pre-Revenue Working Capital & Float',
  'General Setup Requirement',
] as const;

export function calculateProjectFinancials(
  project: Project,
  allEntries: LedgerEntry[]
): ProjectFinancialSummary {
  const projectEntries = allEntries.filter(e => e.projectId === project.id);
  const partners = project.partners;

  const partnerSummaries: Record<string, PartnerFinancialSummary> = {};
  partners.forEach(p => {
    partnerSummaries[p.id] = {
      partnerId: p.id,
      name: p.name,
      role: p.role,
      equityPercentage: p.equityPercentage,
      avatarColor: p.avatarColor,
      capitalContributed: 0,
      loansProvided: 0,
      loansRepaid: 0,
      netLoanOutstanding: 0,
      personalExpensesPaid: 0,
      personalExpensesReimbursed: 0,
      reimbursementPending: 0,
      withdrawalsTaken: 0,
      totalCashInjected: 0,
      contributionShare: 0,
      equityDelta: 0,
      contributionCount: 0,
      latestContributionDate: null,
      netReceivableFromProject: 0,
    };
  });

  let totalCapitalContributed = 0;
  let totalLoansProvided = 0;
  let totalProjectExpensesPaid = 0;
  let totalPersonalExpensesApproved = 0;
  let totalReimbursementsPaid = 0;
  let totalWithdrawals = 0;
  let pendingApprovalsValue = 0;
  let pendingApprovalsCount = 0;
  let totalInvested = 0;
  let approvedInvested = 0;
  let pendingInvested = 0;
  let contributionsCount = 0;

  const purposeTotals: Record<string, { amount: number; count: number }> = {};

  projectEntries.forEach(entry => {
    const amount = entry.amount || 0;
    const isContributionType = ['capital_contribution', 'partner_loan', 'personal_expense'].includes(entry.type);

    if (isContributionType) {
      contributionsCount += 1;
    }

    if (entry.status === 'pending') {
      pendingApprovalsCount += 1;
      if (amount > 0) {
        pendingApprovalsValue += amount;
        if (isContributionType) {
          pendingInvested += amount;
        }
      }
      return;
    }

    if (entry.status !== 'approved') {
      return;
    }

    const payer = entry.payerPartnerId;
    const recipient = entry.recipientPartnerId;

    if (isContributionType && amount > 0) {
      totalInvested += amount;
      approvedInvested += amount;

      // Track by purpose / category
      const cat = entry.category || 'General Setup Requirement';
      if (!purposeTotals[cat]) {
        purposeTotals[cat] = { amount: 0, count: 0 };
      }
      purposeTotals[cat].amount += amount;
      purposeTotals[cat].count += 1;

      // Track partner contribution counts & dates
      if (payer && partnerSummaries[payer]) {
        partnerSummaries[payer].contributionCount += 1;
        if (
          !partnerSummaries[payer].latestContributionDate ||
          new Date(entry.date) > new Date(partnerSummaries[payer].latestContributionDate!)
        ) {
          partnerSummaries[payer].latestContributionDate = entry.date;
        }
      }
    }

    switch (entry.type) {
      case 'capital_contribution':
        totalCapitalContributed += amount;
        if (payer && partnerSummaries[payer]) {
          partnerSummaries[payer].capitalContributed += amount;
          partnerSummaries[payer].totalCashInjected += amount;
        }
        break;

      case 'partner_loan':
        totalLoansProvided += amount;
        if (payer && partnerSummaries[payer]) {
          partnerSummaries[payer].loansProvided += amount;
          partnerSummaries[payer].netLoanOutstanding += amount;
          partnerSummaries[payer].totalCashInjected += amount;
        }
        break;

      case 'personal_expense':
        // Partner paid direct setup cost out of pocket
        totalPersonalExpensesApproved += amount;
        if (payer && partnerSummaries[payer]) {
          partnerSummaries[payer].personalExpensesPaid += amount;
          partnerSummaries[payer].reimbursementPending += amount;
          partnerSummaries[payer].totalCashInjected += amount;
        }
        break;

      case 'project_expense':
        // Paid directly from company account
        totalProjectExpensesPaid += amount;
        break;

      case 'reimbursement':
        // Company pays back partner
        totalReimbursementsPaid += amount;
        if (recipient && partnerSummaries[recipient]) {
          partnerSummaries[recipient].personalExpensesReimbursed += amount;
          partnerSummaries[recipient].reimbursementPending = Math.max(
            0,
            partnerSummaries[recipient].reimbursementPending - amount
          );
        }
        break;

      case 'withdrawal':
        totalWithdrawals += amount;
        if (recipient && partnerSummaries[recipient]) {
          partnerSummaries[recipient].withdrawalsTaken += amount;
        }
        break;

      default:
        break;
    }
  });

  // Calculate net receivables, contribution share, and equity comparison per partner
  Object.values(partnerSummaries).forEach(ps => {
    ps.netReceivableFromProject = ps.reimbursementPending + ps.netLoanOutstanding;
    ps.contributionShare = totalInvested > 0 ? (ps.totalCashInjected / totalInvested) * 100 : 0;
    ps.equityDelta = ps.contributionShare - ps.equityPercentage;
  });

  const totalInflow = totalCapitalContributed + totalLoansProvided;
  const totalOutflow = totalProjectExpensesPaid + totalReimbursementsPaid + totalWithdrawals;
  const availableFunds = totalInflow - totalOutflow;

  let totalPendingReimbursements = 0;
  Object.values(partnerSummaries).forEach(p => {
    totalPendingReimbursements += p.reimbursementPending;
  });

  // Convert purposeTotals to sorted array
  const purposeBreakdown: SetupPurposeItem[] = Object.entries(purposeTotals)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalInvested > 0 ? (data.amount / totalInvested) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    availableFunds,
    totalInvested,
    approvedInvested,
    pendingInvested,
    contributionsCount,
    totalCapitalContributed,
    totalLoansProvided,
    totalInflow,
    totalProjectExpensesPaid,
    totalPersonalExpensesApproved,
    totalReimbursementsPaid,
    totalWithdrawals,
    totalOutflow,
    totalPendingReimbursements,
    pendingApprovalsValue,
    pendingApprovalsCount,
    purposeBreakdown,
    partnerSummaries,
  };
}

// ---------------- Formatters & Helpers ---------------- //

export function formatCurrency(amount: number | undefined, currency: string = '₹'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '—';
  
  if (currency === '₹' || currency === 'INR') {
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
    return `₹${formatted}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === '€' ? 'EUR' : currency === '£' ? 'GBP' : 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatLakhs(amount: number | undefined): string {
  if (amount === undefined || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  }
  return `${sign}₹${abs}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

export function getEntryTypeMeta(type: EntryType): {
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  iconColor: string;
  isFinancial: boolean;
  sign: '+' | '-' | 'neutral';
} {
  switch (type) {
    case 'capital_contribution':
      return {
        label: 'Core Equity Capital',
        shortLabel: 'Capital',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badgeText: 'text-emerald-800',
        iconColor: 'text-emerald-600',
        isFinancial: true,
        sign: '+',
      };
    case 'partner_loan':
      return {
        label: 'Founder Setup Advance',
        shortLabel: 'Advance',
        badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        badgeText: 'text-indigo-800',
        iconColor: 'text-indigo-600',
        isFinancial: true,
        sign: '+',
      };
    case 'personal_expense':
      return {
        label: 'Direct Setup Payment',
        shortLabel: 'Direct Paid',
        badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
        badgeText: 'text-amber-900',
        iconColor: 'text-amber-600',
        isFinancial: true,
        sign: 'neutral', // paid out of pocket, owed by venture setup pool
      };
    case 'project_expense':
      return {
        label: 'Pooled Setup Outlay',
        shortLabel: 'Pooled Outlay',
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
        badgeText: 'text-rose-800',
        iconColor: 'text-rose-600',
        isFinancial: true,
        sign: '-',
      };
    case 'reimbursement':
      return {
        label: 'Advance Settlement',
        shortLabel: 'Settled',
        badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
        badgeText: 'text-teal-800',
        iconColor: 'text-teal-600',
        isFinancial: true,
        sign: '-',
      };
    case 'withdrawal':
      return {
        label: 'Capital Return / Draw',
        shortLabel: 'Draw',
        badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
        badgeText: 'text-orange-800',
        iconColor: 'text-orange-600',
        isFinancial: true,
        sign: '-',
      };
    case 'decision':
      return {
        label: 'Partner Agreement / Vote',
        shortLabel: 'Agreement',
        badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
        badgeText: 'text-purple-800',
        iconColor: 'text-purple-600',
        isFinancial: false,
        sign: 'neutral',
      };
    case 'note':
      return {
        label: 'Setup Memo / Record',
        shortLabel: 'Memo',
        badgeBg: 'bg-stone-100 text-stone-800 border-stone-200',
        badgeText: 'text-stone-800',
        iconColor: 'text-stone-600',
        isFinancial: false,
        sign: 'neutral',
      };
  }
}

export function getApprovalStatusMeta(status: ApprovalStatus): {
  label: string;
  pillClasses: string;
  dotColor: string;
} {
  switch (status) {
    case 'approved':
      return {
        label: 'Approved',
        pillClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    case 'pending':
      return {
        label: 'Pending Approval',
        pillClasses: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        pillClasses: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
      };
    case 'amended':
      return {
        label: 'Amended',
        pillClasses: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
      };
  }
}
