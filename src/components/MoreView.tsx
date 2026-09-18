import React, { useState } from 'react';
import { Project, Partner, AuditLogItem, UserProfile } from '../types';
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
  LogOut
} from 'lucide-react';

interface MoreViewProps {
  project: Project;
  projects: Project[];
  activePartner: Partner;
  auditLog: AuditLogItem[];
  currentUser: UserProfile | null;
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
  onSelectPartner,
  onSelectProject,
  onOpenNewProjectModal,
  onInvitePartner,
  onResetData,
  onUpdateProjectSettings,
  onSignOut,
}) => {
  const [activeSection, setActiveSection] = useState<'partners' | 'audit' | 'projects' | 'settings'>('partners');

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

      {/* Switch Partner Persona (Clean Stone Card) */}
      <div className="bg-stone-900 text-white p-4 rounded-2xl shadow-2xs space-y-2.5 border border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-stone-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Switch Active Partner Persona</span>
          </div>
          <span className="text-[10px] text-stone-400">Tap to switch</span>
        </div>
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

      {/* Minimal Sub-Navigation Tabs */}
      <div className="flex bg-stone-200/70 p-1 rounded-xl text-xs font-semibold text-stone-600">
        <button
          onClick={() => setActiveSection('partners')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeSection === 'partners' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Partners ({project.partners.length})
        </button>
        <button
          onClick={() => setActiveSection('audit')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeSection === 'audit' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Audit Log
        </button>
        <button
          onClick={() => setActiveSection('projects')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeSection === 'projects' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Ventures
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeSection === 'settings' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
          }`}
        >
          Settings
        </button>
      </div>

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

            <button
              id="reset-demo-data-btn"
              onClick={() => {
                if (confirm('Reset project data back to clean Indian LLP scenario in Firestore?')) {
                  onResetData();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-semibold text-rose-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Clean Indian LLP Scenario</span>
            </button>
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
