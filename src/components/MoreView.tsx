import React, { useState, useEffect } from 'react';
import { Project, Partner, AuditLogItem, UserProfile, AllowedUser } from '../types';
import { formatDate, formatRelativeTime } from '../utils/storage';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  History, 
  Building2, 
  Download, 
  RotateCcw, 
  Share2, 
  Check, 
  Copy, 
  Sliders,
  LogOut,
  Lock,
  Key,
  Trash2,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { 
  fetchAllowedUsers, 
  addAllowedUser, 
  removeAllowedUser, 
  BOOTSTRAP_ADMIN_EMAIL 
} from '../services/firestoreService';

interface MoreViewProps {
  project: Project;
  projects: Project[];
  activePartner: Partner;
  auditLog: AuditLogItem[];
  currentUser: UserProfile | null;
  isProjectOwner?: boolean;
  isAdmin?: boolean;
  isDemoMode?: boolean;
  onSelectPartner: (partnerId: string) => void;
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  onInvitePartner: (newPartner: { name: string; email: string; role: string; equityPercentage: number }) => void;
  onResetData: () => void;
  onUpdateProjectSettings: (currency: string, defaultApprovalThreshold: number) => void;
  onSignOut: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  project,
  projects,
  activePartner,
  auditLog,
  currentUser,
  isProjectOwner = false,
  isAdmin = false,
  isDemoMode = false,
  onSelectPartner,
  onSelectProject,
  onOpenNewProjectModal,
  onInvitePartner,
  onResetData,
  onUpdateProjectSettings,
  onSignOut,
}) => {
  const [activeSection, setActiveSection] = useState<'partners' | 'access' | 'audit' | 'projects' | 'settings'>('partners');

  // Allowed Users (invite-only table)
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loadingAllowed, setLoadingAllowed] = useState(false);
  const [newAllowedEmail, setNewAllowedEmail] = useState('');
  const [newAllowedNotes, setNewAllowedNotes] = useState('');
  const [allowedMsg, setAllowedMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeSection === 'access') {
      loadAllowed();
    }
  }, [activeSection]);

  const loadAllowed = async () => {
    setLoadingAllowed(true);
    setAllowedMsg(null);
    try {
      const list = await fetchAllowedUsers();
      setAllowedUsers(list);
    } catch (err: any) {
      setAllowedMsg({ type: 'error', text: err.message || 'Failed to load allowed users table.' });
    } finally {
      setLoadingAllowed(false);
    }
  };

  const handleAddAllowedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newAllowedEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAllowedMsg({ type: 'error', text: 'Please provide a valid email address.' });
      return;
    }

    try {
      await addAllowedUser(cleanEmail, newAllowedNotes.trim() || undefined, 'partner', currentUser?.email || undefined);
      setNewAllowedEmail('');
      setNewAllowedNotes('');
      setAllowedMsg({ type: 'success', text: `Pre-approved ${cleanEmail} successfully!` });
      await loadAllowed();
    } catch (err: any) {
      setAllowedMsg({ type: 'error', text: err.message || 'Failed to add approved user.' });
    }
  };

  const handleRemoveAllowedUser = async (emailToRemove: string) => {
    if (emailToRemove.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
      alert('Cannot remove the primary administrator.');
      return;
    }
    if (!confirm(`Are you sure you want to revoke login access for ${emailToRemove}?`)) {
      return;
    }

    try {
      await removeAllowedUser(emailToRemove);
      setAllowedMsg({ type: 'success', text: `Removed access for ${emailToRemove}.` });
      await loadAllowed();
    } catch (err: any) {
      setAllowedMsg({ type: 'error', text: err.message || 'Failed to remove user.' });
    }
  };

  // Invite partner
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Partner');
  const [inviteEquity, setInviteEquity] = useState('10');
  const [copiedLink, setCopiedLink] = useState(false);

  // Settings
  const [currency, setCurrency] = useState(project.currency);
  const [threshold, setThreshold] = useState(String(project.defaultApprovalThreshold));

  const projectAuditLogs = auditLog.filter(a => a.projectId === project.id);
  const partnerMap = new Map(project.partners.map(p => [p.id, p]));

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      alert('Please fill out name and email.');
      return;
    }

    onInvitePartner({
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole.trim() || 'Partner',
      equityPercentage: Number(inviteEquity) || 0,
    });

    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setInviteEquity('10');
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join?project=${project.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportJSON = () => {
    const data = {
      project,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_Backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = () => {
    onUpdateProjectSettings(currency, Number(threshold) || 0);
    alert('Project settings saved.');
  };

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto px-4 pt-3.5 text-xs">
      
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-stone-900">Project & Partners (साझेदारी)</h2>
        <p className="text-xs text-stone-500">
          Equity cap table, partner personas, and audit trail
        </p>
      </div>

      {/* Partner Identity Card: Restricted persona switching to Demo Mode only */}
      {isDemoMode ? (
        <div className="bg-stone-900 text-white p-4 rounded-2xl shadow-2xs space-y-2.5 border border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-stone-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Demo Partner Persona Simulator</span>
            </div>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-semibold">
              Sandbox Only
            </span>
          </div>
          <p className="text-[11px] text-stone-400">
            Simulate how approvals, voting, and entries appear from other partners' vantage points.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {project.partners.map((p) => (
              <button
                key={p.id}
                id={`switch-persona-${p.id}`}
                onClick={() => onSelectPartner(p.id)}
                className={`p-2 rounded-xl text-center transition-all ${
                  p.id === activePartner.id
                    ? 'bg-white text-stone-900 font-bold shadow-2xs'
                    : 'bg-stone-800 hover:bg-stone-750 text-stone-300'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full mx-auto mb-1 text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="truncate text-xs">{p.name.split(' ')[0]}</div>
                <div className="text-[10px] opacity-70 font-normal">{p.equityPercentage}%</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* In Production: Verified, Single-Identity Card */
        <div className="bg-stone-900 text-white p-4 rounded-2xl shadow-2xs space-y-2 border border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Authenticated Project Partner</span>
            </div>
            {isProjectOwner ? (
              <span className="text-[10px] bg-amber-900/80 text-amber-200 border border-amber-700/60 px-2 py-0.5 rounded-full font-bold">
                Project Owner / Admin
              </span>
            ) : (
              <span className="text-[10px] bg-stone-800 text-stone-300 border border-stone-700 px-2 py-0.5 rounded-full font-medium">
                Authorized Partner
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-xs"
              style={{ backgroundColor: activePartner.avatarColor }}
            >
              {activePartner.name.charAt(0)}
            </div>
            <div className="truncate">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{activePartner.name}</span>
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/60">
                  {activePartner.equityPercentage}% Equity
                </span>
              </div>
              <div className="text-xs text-stone-400 truncate">
                {activePartner.role} • {currentUser?.email || activePartner.email || 'UID Verified'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Sub-Navigation Tabs */}
      <div className="flex bg-stone-200/70 p-1 rounded-xl text-xs font-semibold text-stone-600 gap-0.5">
        <button
          onClick={() => setActiveSection('partners')}
          className={`flex-1 py-1.5 px-1 rounded-lg transition-all text-center ${
            activeSection === 'partners' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Partners
        </button>
        <button
          onClick={() => setActiveSection('access')}
          className={`flex-1 py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
            activeSection === 'access' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>Invite Table</span>
        </button>
        <button
          onClick={() => setActiveSection('audit')}
          className={`flex-1 py-1.5 px-1 rounded-lg transition-all text-center ${
            activeSection === 'audit' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Audit
        </button>
        <button
          onClick={() => setActiveSection('projects')}
          className={`flex-1 py-1.5 px-1 rounded-lg transition-all text-center ${
            activeSection === 'projects' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Ventures
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`flex-1 py-1.5 px-1 rounded-lg transition-all text-center ${
            activeSection === 'settings' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Settings
        </button>
      </div>

      {/* SECTION: INVITE-ONLY ACCESS TABLE (allowed_users) */}
      {activeSection === 'access' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Header Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <span>Approved Users Table (`allowed_users`)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Gated Pilot
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              This app is strictly invite-only. Only email addresses present in the Firestore <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800">allowed_users</code> collection can sign up and log in. Unlisted emails are automatically blocked.
            </p>
          </div>

          {/* Feedback Message */}
          {allowedMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              allowedMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {allowedMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{allowedMsg.text}</span>
            </div>
          )}

          {/* Add Approved Email Form */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 text-xs">Pre-Approve New Email</span>
              <span className="text-[10px] text-stone-400">Admin Control</span>
            </div>

            <form onSubmit={handleAddAllowedUser} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Google Account Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. partner@example.com"
                  value={newAllowedEmail}
                  onChange={(e) => setNewAllowedEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Notes / Role (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Co-founder / Angel Investor"
                  value={newAllowedNotes}
                  onChange={(e) => setNewAllowedNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add to Approved Users Table</span>
              </button>
            </form>
          </div>

          {/* Allowed Users List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-stone-600 text-[11px] uppercase tracking-wider">
                Approved Emails ({allowedUsers.length})
              </span>
              <button
                onClick={loadAllowed}
                disabled={loadingAllowed}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                {loadingAllowed ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingAllowed && allowedUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-200">
                Loading approved users...
              </div>
            ) : allowedUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                No approved users loaded.
              </div>
            ) : (
              <div className="space-y-2">
                {allowedUsers.map((u) => {
                  const isBootstrap = u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
                  return (
                    <div
                      key={u.email}
                      className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between shadow-2xs gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {u.email}
                          </span>
                          {isBootstrap ? (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-bold flex-shrink-0">
                              Primary Admin
                            </span>
                          ) : u.role === 'admin' ? (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-md font-semibold flex-shrink-0">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md font-semibold flex-shrink-0">
                              Approved Partner
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5 truncate">
                          {u.notes ? `${u.notes} • ` : ''}Added {formatDate(u.addedAt || new Date().toISOString())}
                        </div>
                      </div>

                      {!isBootstrap && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAllowedUser(u.email)}
                          title="Revoke access"
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Firestore Management Tip */}
          <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-[11px] text-stone-600 space-y-1">
            <span className="font-semibold text-stone-800 block">Firebase Console Direct Access:</span>
            <p className="leading-normal">
              You can also add or delete emails directly in the Firestore database under collection:
              <br />
              <code className="font-mono text-emerald-900 font-semibold">allowed_users/{`{email_lowercase}`}</code>
            </p>
          </div>

        </div>
      )}

      {/* SECTION 1: PARTNERS */}
      {activeSection === 'partners' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 text-[11px] uppercase tracking-wider">
              Equity Cap Table
            </span>
            <button
              id="btn-open-invite-partner"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-800 text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Partner</span>
            </button>
          </div>

          <div className="space-y-2">
            {project.partners.map((partner) => (
              <div
                key={partner.id}
                className="bg-white border border-stone-200/90 rounded-xl p-3 shadow-2xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: partner.avatarColor }}
                  >
                    {partner.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <span>{partner.name}</span>
                      {partner.id === activePartner.id && (
                        <span className="bg-stone-100 text-stone-700 text-[9px] font-semibold px-1.5 py-0.2 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {partner.role} • {partner.email}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-stone-800">
                    {partner.equityPercentage}%
                  </div>
                  <span className="text-[10px] text-stone-400">Equity</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Share Link */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-800 text-xs">Invite Partner Link</div>
              <div className="text-[11px] text-stone-500">Share with co-founders to join this ledger</div>
            </div>
            <button
              onClick={handleCopyInviteLink}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: AUDIT TRAIL */}
      {activeSection === 'audit' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 text-[11px] uppercase tracking-wider">
              Immutable Audit Log ({projectAuditLogs.length})
            </span>
          </div>

          <div className="space-y-1.5">
            {projectAuditLogs.map((log) => {
              const actor = partnerMap.get(log.performedByPartnerId);
              return (
                <div
                  key={log.id}
                  className="bg-white border border-stone-200/90 rounded-xl p-3 text-xs shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-stone-800">
                      {actor?.name || 'Partner'}
                    </span>
                    <span className="text-stone-400">{formatRelativeTime(log.timestamp)}</span>
                  </div>
                  <p className="text-stone-700 font-medium">{log.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: PROJECTS */}
      {activeSection === 'projects' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-600 text-[11px] uppercase tracking-wider">
              Your Ventures ({projects.length})
            </span>
            <button
              onClick={onOpenNewProjectModal}
              className="text-emerald-700 font-semibold hover:underline text-xs"
            >
              + New Venture
            </button>
          </div>

          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  p.id === project.id
                    ? 'border-emerald-600 bg-emerald-50/30'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-xs">{p.name}</h4>
                  {p.id === project.id && (
                    <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-medium">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: SETTINGS */}
      {activeSection === 'settings' && (
        <div className="space-y-3 bg-white border border-stone-200/90 rounded-xl p-4 shadow-2xs">
          <div className="font-bold text-stone-800 text-xs uppercase tracking-wider">
            Configuration & Backup
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white text-xs"
              >
                <option value="₹">₹ INR (Indian Rupee)</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
                <option value="£">£ GBP</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Default Approval Threshold ({currency})
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2 bg-stone-900 hover:bg-black text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Save Settings
            </button>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-2">
            {/* Logged in User Account Status */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Connected Account:</span>
                <span className="font-semibold text-stone-800 truncate max-w-[180px]">
                  {currentUser?.email || (currentUser?.displayName ? currentUser.displayName : 'Live Demo Sandbox')}
                </span>
              </div>
              <button
                id="signout-btn"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-800 transition-colors shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-500" />
                <span>{currentUser ? 'Sign Out of Google' : 'Exit Demo & Go to Login'}</span>
              </button>
            </div>

            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-stone-50 border border-stone-200 hover:bg-stone-100 rounded-xl text-xs font-semibold text-stone-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Project JSON</span>
            </button>

            {isDemoMode ? (
              <button
                id="reset-demo-data-btn"
                onClick={() => {
                  if (confirm('Reset demo sandbox data to clean sample records?')) {
                    onResetData();
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Sandbox Records</span>
              </button>
            ) : (
              <div className="text-[11px] text-stone-400 text-center py-1">
                Production multi-tenant records are permanently protected by Firestore security rules.
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h3 className="text-sm font-bold text-stone-900">Invite Partner</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Partner Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Email / Phone</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vikram@deccan-tech.in"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Role / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Co-founder & COO"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Equity Stake %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={inviteEquity}
                    onChange={(e) => setInviteEquity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-700 text-white font-semibold rounded-xl hover:bg-emerald-800"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
