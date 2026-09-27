import React, { useState } from 'react';
import { Project, Partner } from '../types';
import { 
  Building2, 
  ChevronDown, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Sparkles,
  ShieldCheck,
  Lock,
  LogOut,
  X
} from 'lucide-react';

interface HeaderProps {
  currentProject: Project;
  projects: Project[];
  activePartner: Partner;
  isDemoMode: boolean;
  onSelectProject: (projectId: string) => void;
  onSelectPartner: (partnerId: string) => void;
  pendingApprovalsForActivePartner: number;
  onOpenNewProjectModal: () => void;
  onNavigateToApprovals: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  activePartner,
  isDemoMode,
  onSelectProject,
  onSelectPartner,
  pendingApprovalsForActivePartner,
  onOpenNewProjectModal,
  onNavigateToApprovals,
  onSignOut,
}) => {
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showPartnerMenu, setShowPartnerMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 transition-colors">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        
        {/* Project Selector - Clean & Minimal */}
        <div className="relative">
          <button
            id="project-selector-btn"
            onClick={() => {
              setShowProjectMenu(!showProjectMenu);
              setShowPartnerMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-2 text-left hover:bg-stone-100/70 p-1.5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {currentProject.name.charAt(0)}
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-stone-900 truncate max-w-[150px]">
                  {currentProject.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </div>
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <span>{currentProject.partners.length} Partners</span>
                <span className="text-stone-300">•</span>
                <span className="font-semibold text-emerald-700">Setup Ledger</span>
              </div>
            </div>
          </button>

          {/* Project Dropdown / Mobile Bottom Sheet */}
          {showProjectMenu && (
            <>
              {/* Desktop Dropdown */}
              <div className="hidden sm:block absolute left-0 mt-2 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  Switch Venture / Khata
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      id={`project-option-${p.id}`}
                      onClick={() => {
                        onSelectProject(p.id);
                        setShowProjectMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-stone-50 transition-colors ${
                        p.id === currentProject.id ? 'bg-emerald-50/60 text-emerald-900 font-medium' : 'text-stone-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-semibold">{p.name}</div>
                        <div className="text-[10px] text-stone-400 truncate">{p.partners.length} partners • {p.currency}</div>
                      </div>
                      {p.id === currentProject.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-stone-100 mt-1 pt-1 px-2">
                  <button
                    id="create-new-project-btn"
                    onClick={() => {
                      setShowProjectMenu(false);
                      onOpenNewProjectModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Venture / Project</span>
                  </button>
                </div>
              </div>

              {/* Mobile Bottom Sheet */}
              <div 
                onClick={(e) => { if (e.target === e.currentTarget) setShowProjectMenu(false); }}
                className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-xs p-0 animate-in fade-in"
              >
                <div className="bg-white w-full max-h-[80dvh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
                  <div className="pt-2.5 pb-1 flex justify-center bg-stone-50 flex-shrink-0">
                    <div className="w-10 h-1 bg-stone-300 rounded-full" />
                  </div>
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50 flex-shrink-0">
                    <h3 className="text-sm font-bold text-stone-900">Switch Venture / Khata</h3>
                    <button onClick={() => setShowProjectMenu(false)} className="p-1 rounded-full text-stone-400 hover:text-stone-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1.5">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p.id);
                          setShowProjectMenu(false);
                        }}
                        className={`w-full p-3 rounded-2xl text-left flex items-center justify-between transition-colors ${
                          p.id === currentProject.id 
                            ? 'bg-emerald-50 text-emerald-950 font-semibold border border-emerald-300' 
                            : 'bg-stone-50 hover:bg-stone-100/80 text-stone-800 border border-stone-200/80'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{p.name}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">{p.partners.length} partners • Currency: {p.currency}</div>
                        </div>
                        {p.id === currentProject.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="p-3.5 bg-stone-50 border-t border-stone-200 pb-safe flex-shrink-0">
                    <button
                      onClick={() => {
                        setShowProjectMenu(false);
                        onOpenNewProjectModal();
                      }}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Venture / Project</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Section: Pending Alert & Active Partner Switcher */}
        <div className="flex items-center gap-2">
          {/* Pending Approvals quick badge */}
          {pendingApprovalsForActivePartner > 0 && (
            <button
              id="pending-approvals-header-badge"
              onClick={onNavigateToApprovals}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 rounded-full text-xs font-semibold transition-colors"
              title={`${pendingApprovalsForActivePartner} approvals pending`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{pendingApprovalsForActivePartner}</span>
            </button>
          )}

          {/* Active Partner Persona Switcher - STRICTLY RESTRICTED TO DEMO MODE */}
          {isDemoMode ? (
            <div className="relative">
              <button
                id="partner-persona-btn"
                onClick={() => {
                  setShowPartnerMenu(!showPartnerMenu);
                  setShowProjectMenu(false);
                }}
                className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200/80 border border-stone-200/80 px-2 py-1 rounded-full text-xs transition-colors"
                title="Demo Persona Simulator"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                  style={{ backgroundColor: activePartner.avatarColor }}
                >
                  {activePartner.name.charAt(0)}
                </div>
                <span className="text-xs font-medium text-stone-800 pr-0.5">
                  {activePartner.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {/* Partner Persona Switcher Dropdown (Demo Only) */}
              {showPartnerMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 flex items-center justify-between">
                    <span>Demo Partner Persona</span>
                    <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Sandbox Sim
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {currentProject.partners.map((partner) => (
                      <button
                        key={partner.id}
                        id={`partner-option-${partner.id}`}
                        onClick={() => {
                          onSelectPartner(partner.id);
                          setShowPartnerMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-stone-50 transition-colors ${
                          partner.id === activePartner.id ? 'bg-emerald-50/50 text-emerald-900 font-medium' : 'text-stone-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs flex-shrink-0"
                            style={{ backgroundColor: partner.avatarColor }}
                          >
                            {partner.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                              <span className="truncate">{partner.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-normal">
                                {partner.equityPercentage}%
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">{partner.role}</div>
                          </div>
                        </div>
                        {partner.id === activePartner.id && (
                          <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* In Production: Verified Identity Button with Logout & Profile Menu */
            <div className="relative">
              <button 
                id="user-profile-menu-btn"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowProjectMenu(false);
                }}
                className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200/80 active:scale-95 border border-stone-200/90 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer"
                title={`Logged in as ${activePartner.name} (${activePartner.email}) - Click for options`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                  style={{ backgroundColor: activePartner.avatarColor }}
                >
                  {activePartner.name.charAt(0)}
                </div>
                <span className="text-xs font-semibold text-stone-800">
                  {activePartner.name.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User Profile Dropdown & Mobile Bottom Sheet */}
              {showUserMenu && (
                <>
                  {/* Desktop Dropdown */}
                  <div className="hidden sm:block absolute right-0 mt-2 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in">
                    {/* Account Header */}
                    <div className="px-3.5 pb-2.5 border-b border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs flex-shrink-0"
                          style={{ backgroundColor: activePartner.avatarColor }}
                        >
                          {activePartner.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-stone-900 truncate">
                            {activePartner.name}
                          </div>
                          <div className="text-[10px] text-stone-500 truncate">
                            {activePartner.email || 'Google Account'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200/60 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">
                          {activePartner.role} • {activePartner.equityPercentage}% Share
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-1.5 px-1.5 space-y-0.5">
                      <button
                        id="header-new-venture-shortcut"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenNewProjectModal();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 rounded-xl transition-colors font-medium text-left"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>New Venture / Project</span>
                      </button>

                      <button
                        id="header-logout-btn"
                        onClick={() => {
                          setShowUserMenu(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-semibold text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Log Out (लॉग आउट)</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Bottom Sheet */}
                  <div 
                    onClick={(e) => { if (e.target === e.currentTarget) setShowUserMenu(false); }}
                    className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-xs p-0 animate-in fade-in"
                  >
                    <div className="bg-white w-full max-h-[80dvh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
                      <div className="pt-2.5 pb-1 flex justify-center bg-stone-50 flex-shrink-0">
                        <div className="w-10 h-1 bg-stone-300 rounded-full" />
                      </div>
                      
                      <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50 flex-shrink-0">
                        <h3 className="text-sm font-bold text-stone-900">Partner Account</h3>
                        <button onClick={() => setShowUserMenu(false)} className="p-1 rounded-full text-stone-400 hover:text-stone-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                        <div className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200/80 rounded-2xl">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-xs flex-shrink-0"
                            style={{ backgroundColor: activePartner.avatarColor }}
                          >
                            {activePartner.name.charAt(0)}
                          </div>
                          <div className="truncate flex-1">
                            <div className="text-sm font-bold text-stone-900 truncate">
                              {activePartner.name}
                            </div>
                            <div className="text-xs text-stone-500 truncate">
                              {activePartner.email || 'Authenticated User'}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span>{activePartner.role} • {activePartner.equityPercentage}% Equity</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              onOpenNewProjectModal();
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-800 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span>Create New Venture / Project</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              onSignOut();
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 transition-colors"
                          >
                            <LogOut className="w-4 h-4 text-rose-600" />
                            <span>Sign Out of VishwasKhata</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-stone-50 border-t border-stone-100 text-center text-[10px] text-stone-400 pb-safe">
                        Secured with Firestore Multi-Tenant Rules
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
