import React from 'react';
import { NavigationTab } from '../types';
import { 
  History, 
  Coins, 
  Plus, 
  CheckSquare, 
  Users
} from 'lucide-react';

interface BottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingApprovalsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90">
      <div className="max-w-md mx-auto px-3 py-1 flex items-center justify-around">
        
        {/* Ledger / Contributions */}
        <button
          id="nav-tab-timeline"
          onClick={() => onSelectTab('timeline')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentTab === 'timeline'
              ? 'text-emerald-700 font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] mt-0.5">Ledger</span>
        </button>

        {/* Capital Pool / Investments */}
        <button
          id="nav-tab-money"
          onClick={() => onSelectTab('money')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentTab === 'money'
              ? 'text-emerald-700 font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Coins className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] mt-0.5">Capital Pool</span>
        </button>

        {/* Center Add / Record Contribution Button */}
        <div className="relative -top-2 flex flex-col items-center">
          <button
            id="nav-tab-add"
            onClick={() => onSelectTab('add')}
            className="w-12 h-12 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white flex items-center justify-center shadow-md border-2 border-white transition-all"
            aria-label="Record partner contribution"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] text-stone-600 font-medium mt-0.5">Contribute</span>
        </div>

        {/* Sign-offs / Approvals */}
        <button
          id="nav-tab-approvals"
          onClick={() => onSelectTab('approvals')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentTab === 'approvals'
              ? 'text-emerald-700 font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5 stroke-[1.8]" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white">
                {pendingApprovalsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5">Sign-offs</span>
        </button>

        {/* Partners */}
        <button
          id="nav-tab-more"
          onClick={() => onSelectTab('more')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            currentTab === 'more'
              ? 'text-emerald-700 font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] mt-0.5">Partners</span>
        </button>

      </div>
    </nav>
  );
};
