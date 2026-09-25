export type EntryType =
  | 'capital_contribution'
  | 'partner_loan'
  | 'personal_expense'
  | 'project_expense'
  | 'reimbursement'
  | 'withdrawal'
  | 'decision'
  | 'note';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'amended';

export type VoteDecision = 'pending' | 'approved' | 'rejected';

export interface PartnerVote {
  partnerId: string;
  approverUid?: string; // Trusted Firebase Auth UID
  decision: VoteDecision;
  note?: string;
  timestamp?: string;
}

export interface Attachment {
  id: string;
  name: string;
  fileType: string;
  mimeType?: string;
  url: string; // Cloud Storage Download URL or safe reference
  storagePath?: string; // Firebase Storage path: projects/{projectId}/entries/{entryId}/{fileId}
  sizeKb: number;
  uploadedByUid?: string;
  uploadedAt: string;
}

export interface EntryComment {
  id: string;
  partnerId: string;
  authorUid?: string;
  text: string;
  createdAt: string;
}

export interface Amendment {
  id: string;
  version: number;
  amendedByPartnerId: string;
  amendedByUid?: string;
  reason: string;
  timestamp: string;
  changedFields: string[];
  previousValues: Record<string, any>;
  approvalRequirement?: 'none' | 'one_partner' | 'majority' | 'unanimous';
}

export interface LedgerEntry {
  id: string;
  projectId: string;
  type: EntryType;
  title: string;
  description?: string;
  category?: string;
  amount?: number;
  currency: string;
  date: string;
  createdByPartnerId: string;
  createdByUid?: string; // Trusted Firebase Auth UID
  payerPartnerId?: string; // Partner who contributed or paid out-of-pocket
  recipientPartnerId?: string; // Partner who received reimbursement or withdrawal
  requiredApproverPartnerIds: string[];
  approvalRequirement?: 'none' | 'one_partner' | 'majority' | 'unanimous';
  votes: PartnerVote[];
  status: ApprovalStatus;
  rejectionReason?: string;
  attachments: Attachment[];
  comments: EntryComment[];
  version: number;
  amendments: Amendment[];
  decisionOptions?: string[]; // For decisions
  selectedOption?: string;
  paymentMethod?: 'UPI' | 'NetBanking' | 'Card' | 'Cash' | 'Cheque';
  gstInvoice?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  uid?: string; // Mapped Firebase Auth UID
  name: string;
  email: string;
  role: string;
  equityPercentage: number;
  avatarColor: string;
  status: 'active' | 'invited';
  phone?: string;
  isOwner?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  currency: string; // '$', '€', '£', etc.
  defaultApprovalThreshold: number;
  createdAt: string;
  partners: Partner[];
  ownerUid: string;
  authorizedUserUids: string[];
  authorizedEmails: string[];
  isDemo?: boolean;
}

export interface AuditLogItem {
  id: string;
  projectId: string;
  entryId?: string;
  entryTitle?: string;
  action: 'create' | 'approve' | 'reject' | 'amend' | 'comment' | 'reimburse';
  performedByPartnerId: string;
  actorUid?: string; // Trusted Firebase Auth UID
  timestamp: string;
  summary: string;
  details?: string;
  isDemo?: boolean;
}

export type NavigationTab = 'timeline' | 'money' | 'add' | 'approvals' | 'more';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt: string;
}

export interface AllowedUser {
  email: string;
  role?: 'admin' | 'partner';
  addedAt: string;
  addedBy?: string;
  notes?: string;
}
