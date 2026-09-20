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
  Lock
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
}) => {
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showPartnerMenu, setShowPartnerMenu] = useState(false);

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
                <span className="font-semibold text-emerald-700">{currentProject.currency} INR</span>
              </div>
            </div>
          </button>

          {/* Project Dropdown */}
          {showProjectMenu && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in">
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
            /* In Production: Verified, Immutable Identity Badge - Impersonation Disallowed */
            <div 
              id="verified-partner-badge"
              className="flex items-center gap-1.5 bg-stone-100 border border-stone-200/90 px-2.5 py-1 rounded-full text-xs"
              title={`Authenticated as ${activePartner.name} (${activePartner.email}) - UID Verified`}
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
              <Lock className="w-3 h-3 text-stone-400 ml-0.5" />
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
