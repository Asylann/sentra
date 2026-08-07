import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, ChevronDown, Check } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function WorkspaceSwitcher() {
  const { currentOrg, orgs, switchOrg, loading } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (loading || !currentOrg) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="size-5 rounded bg-white/5 animate-pulse" />
        <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  const WorkspaceIcon = currentOrg.workspace_type === 'company' ? Building2 : User;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
      >
        <div className="size-6 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
          <WorkspaceIcon className="size-3.5 text-zinc-400" />
        </div>
        <span className="text-sm font-medium text-zinc-300 max-w-[120px] truncate">
          {currentOrg.display_name || currentOrg.login}
        </span>
        <ChevronDown className="size-3.5 text-zinc-600" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-10 left-0 z-20 w-64 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Workspaces</p>
              </div>
              <div className="py-1 max-h-60 overflow-y-auto">
                {orgs.map((org) => {
                  const isActive = org.id === currentOrg.id;
                  const Icon = org.workspace_type === 'company' ? Building2 : User;
                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        if (!isActive) switchOrg(org.id);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="size-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                        {org.avatar_url ? (
                          <img src={org.avatar_url} alt="" className="size-5 rounded" />
                        ) : (
                          <Icon className="size-3.5 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {org.display_name || org.login}
                        </p>
                        <p className="text-[10px] text-zinc-600 capitalize">{org.workspace_type}</p>
                      </div>
                      {isActive && <Check className="size-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
