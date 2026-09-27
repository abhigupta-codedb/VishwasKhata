import React, { useState } from 'react';
import { Project, Partner } from '../types';
import { Building2, X, Plus, Trash2 } from 'lucide-react';

interface NewProjectModalProps {
  onClose: () => void;
  onCreateProject: (project: Project) => void;
  activePartner: Partner;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  onClose,
  onCreateProject,
  activePartner,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [partner2Name, setPartner2Name] = useState('');
  const [partner2Email, setPartner2Email] = useState('');
  const [partner2Equity, setPartner2Equity] = useState('50');
  const [activePartnerEquity, setActivePartnerEquity] = useState('50');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a project name.');
      return;
    }

    const projectId = `proj_${Date.now()}`;
    const partners: Partner[] = [
      {
        ...activePartner,
        equityPercentage: Number(activePartnerEquity) || 50,
      },
    ];

    if (partner2Name.trim()) {
      const normalizedPartnerEmail = partner2Email.trim()
        ? partner2Email.trim().toLowerCase()
        : `${partner2Name.toLowerCase().replace(/\s+/g, '')}@partner.com`;

      partners.push({
        id: `partner_${Date.now()}`,
        name: partner2Name.trim(),
        email: normalizedPartnerEmail,
        role: 'Co-Founder',
        equityPercentage: Number(partner2Equity) || 50,
        avatarColor: '#4f46e5',
        status: 'active',
      });
    }

    const newProject: Project = {
      id: projectId,
      name: name.trim(),
      description: description.trim() || 'Shared partner project pool',
      currency,
      defaultApprovalThreshold: 250,
      createdAt: new Date().toISOString(),
      partners,
      ownerUid: activePartner.uid || 'user',
      authorizedUserUids: activePartner.uid ? [activePartner.uid] : [],
      authorizedEmails: partners
        .map(p => (p.email ? p.email.trim().toLowerCase() : ''))
        .filter(Boolean) as string[],
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in"
    >
      <div className="bg-white w-full sm:max-w-md max-h-[92dvh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 text-xs">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-stone-50 flex-shrink-0">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 bg-stone-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">Start Shared Project</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Project Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cobalt AI Ventures"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Seed capital, app development, marketing"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="₹">INR (₹)</option>
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Your Equity %</label>
                <input
                  type="number"
                  value={activePartnerEquity}
                  onChange={(e) => setActivePartnerEquity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <span className="font-semibold text-stone-800 block text-[11px]">
                Initial Co-Partner (Optional)
              </span>
              <input
                type="text"
                placeholder="Partner Name"
                value={partner2Name}
                onChange={(e) => setPartner2Name(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  value={partner2Email}
                  onChange={(e) => setPartner2Email(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  placeholder="Equity %"
                  value={partner2Equity}
                  onChange={(e) => setPartner2Equity(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 border-t border-stone-200 pb-safe sm:pb-3.5 flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-stone-600 hover:bg-stone-200/80 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 active:scale-[0.99] shadow-xs transition-all"
            >
              Create Project
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
