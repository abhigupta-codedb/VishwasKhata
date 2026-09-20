import { EntryType, LedgerEntry, Partner, Project, VoteDecision } from '../types';

export type ApprovalRequirementLevel = 'none' | 'one_partner' | 'majority' | 'unanimous';

export interface ApprovalRequirement {
  level: ApprovalRequirementLevel;
  label: string;
  description: string;
  requiredVotesCount: number;
  requiredApproverPartnerIds: string[];
}

/**
 * Calculates approval requirements strictly from project configuration and entry characteristics.
 * The entry creator cannot manually bypass this policy.
 */
export function getApprovalRequirement(
  project: Project,
  entry: {
    type: EntryType;
    amount?: number;
    createdByPartnerId: string;
    payerPartnerId?: string;
  }
): ApprovalRequirement {
  const eligibleApprovers = project.partners
    .filter(p => p.id !== entry.createdByPartnerId && p.status === 'active')
    .map(p => p.id);

  const totalEligible = eligibleApprovers.length;

  // Single-partner venture: no co-partner approvals possible
  if (totalEligible === 0) {
    return {
      level: 'none',
      label: 'Auto-Approved (Solo)',
      description: 'No other partners in project to approve',
      requiredVotesCount: 0,
      requiredApproverPartnerIds: [],
    };
  }

  // Pure informative notes do not lock financial balances
  if (entry.type === 'note') {
    return {
      level: 'none',
      label: 'No Approval Needed',
      description: 'Informational memo',
      requiredVotesCount: 0,
      requiredApproverPartnerIds: [],
    };
  }

  // Capital equity contributions, loans, and profit withdrawals impact legal venture poonji
  if (entry.type === 'capital_contribution' || entry.type === 'partner_loan' || entry.type === 'withdrawal') {
    return {
      level: 'unanimous',
      label: 'Unanimous Approval Required',
      description: 'All co-partners must sign off on capital/loan/draw movements',
      requiredVotesCount: totalEligible,
      requiredApproverPartnerIds: eligibleApprovers,
    };
  }

  // Formal governance/strategic partner decisions
  if (entry.type === 'decision') {
    const majorityCount = Math.max(1, Math.ceil(totalEligible / 2));
    return {
      level: totalEligible > 2 ? 'majority' : 'unanimous',
      label: totalEligible > 2 ? 'Majority Approval Required' : 'Unanimous Approval Required',
      description: 'Partner consensus vote on project decision',
      requiredVotesCount: totalEligible > 2 ? majorityCount : totalEligible,
      requiredApproverPartnerIds: eligibleApprovers,
    };
  }

  // Financial expenses: Personal expense (reimbursement needed), project expense, or direct reimbursement
  const amount = Number(entry.amount) || 0;
  const baseThreshold = project.defaultApprovalThreshold || 5000;

  // Tier 1: Small out-of-pocket expenses (≤ ₹5,000 or baseThreshold)
  if (amount <= baseThreshold) {
    return {
      level: 'none',
      label: 'No Approval Needed (Below Threshold)',
      description: `Transactions ≤ ${project.currency}${baseThreshold.toLocaleString('en-IN')} do not require prior approval`,
      requiredVotesCount: 0,
      requiredApproverPartnerIds: [],
    };
  }

  // Tier 2: Mid-tier expenses (₹5,001 - ₹25,000 or 5x baseThreshold)
  const tier2Limit = baseThreshold * 5; // e.g. ₹25,000
  if (amount <= tier2Limit) {
    return {
      level: 'one_partner',
      label: '1 Co-Partner Sign-Off Required',
      description: `Requires approval from at least 1 co-partner`,
      requiredVotesCount: 1,
      requiredApproverPartnerIds: eligibleApprovers,
    };
  }

  // Tier 3: Substantial expenses (₹25,001 - ₹100,000 or 20x baseThreshold)
  const tier3Limit = baseThreshold * 20; // e.g. ₹100,000
  if (amount <= tier3Limit) {
    const majorityCount = Math.max(1, Math.ceil(totalEligible / 2));
    return {
      level: 'majority',
      label: 'Majority Co-Partner Sign-Off',
      description: `Requires approval from majority (${majorityCount} of ${totalEligible}) of co-partners`,
      requiredVotesCount: majorityCount,
      requiredApproverPartnerIds: eligibleApprovers,
    };
  }

  // Tier 4: Major expenditures (> ₹1,00,000)
  return {
    level: 'unanimous',
    label: 'Unanimous Approval Required (Large Expense)',
    description: `All ${totalEligible} co-partners must approve expenditures above ${project.currency}${tier3Limit.toLocaleString('en-IN')}`,
    requiredVotesCount: totalEligible,
    requiredApproverPartnerIds: eligibleApprovers,
  };
}

/**
 * Re-evaluates status of an entry given its current votes and requirement.
 * Prevents duplicate votes per UID/partner.
 */
export function evaluateEntryStatus(
  entry: LedgerEntry,
  project: Project
): { status: 'pending' | 'approved' | 'rejected'; approvedCount: number; requiredCount: number } {
  const req = getApprovalRequirement(project, {
    type: entry.type,
    amount: entry.amount,
    createdByPartnerId: entry.createdByPartnerId,
    payerPartnerId: entry.payerPartnerId,
  });

  if (req.level === 'none') {
    return { status: 'approved', approvedCount: 0, requiredCount: 0 };
  }

  // Deduplicate votes by approverUid or partnerId
  const validVotes = new Map<string, VoteDecision>();
  for (const v of entry.votes) {
    const key = v.approverUid || v.partnerId;
    if (key && (v.decision === 'approved' || v.decision === 'rejected')) {
      validVotes.set(key, v.decision);
    }
  }

  // If any required partner rejected, entire entry is rejected
  for (const decision of validVotes.values()) {
    if (decision === 'rejected') {
      return { status: 'rejected', approvedCount: 0, requiredCount: req.requiredVotesCount };
    }
  }

  // Count approvals from eligible approvers
  let approvedCount = 0;
  for (const approverId of req.requiredApproverPartnerIds) {
    const partner = project.partners.find(p => p.id === approverId);
    const vote = entry.votes.find(
      v => v.partnerId === approverId || (partner?.uid && v.approverUid === partner.uid)
    );
    if (vote && vote.decision === 'approved') {
      approvedCount++;
    }
  }

  if (approvedCount >= req.requiredVotesCount) {
    return { status: 'approved', approvedCount, requiredCount: req.requiredVotesCount };
  }

  return { status: 'pending', approvedCount, requiredCount: req.requiredVotesCount };
}

/**
 * Checks if updates to an entry constitute a material change requiring re-approval.
 */
export function isMaterialChange(
  original: LedgerEntry,
  updates: {
    title?: string;
    amount?: number;
    category?: string;
    description?: string;
    date?: string;
  }
): boolean {
  if (updates.amount !== undefined && Number(updates.amount) !== Number(original.amount)) {
    return true;
  }
  if (updates.title !== undefined && updates.title.trim() !== original.title.trim()) {
    return true;
  }
  if (updates.date !== undefined && updates.date !== original.date) {
    return true;
  }
  return false;
}
