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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom-4 text-xs">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Start Shared Project</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Cobalt AI Ventures"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Seed capital, app development, marketing"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white"
              >
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
                <option value="₹">INR (₹)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Your Equity %</label>
              <input
                type="number"
                value={activePartnerEquity}
                onChange={(e) => setActivePartnerEquity(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-slate-800 block text-[11px]">
              Initial Co-Partner (Optional)
            </span>
            <input
              type="text"
              placeholder="Partner Name"
              value={partner2Name}
              onChange={(e) => setPartner2Name(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                placeholder="Email address"
                value={partner2Email}
                onChange={(e) => setPartner2Email(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="number"
                placeholder="Equity %"
                value={partner2Equity}
                onChange={(e) => setPartner2Equity(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-xs"
            >
              Create Project
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
