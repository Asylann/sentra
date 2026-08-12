import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, User, ChevronDown, Check, Settings, Plus,
  Pencil, Trash2, X, Loader2, AlertCircle,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────
   CREATE WORKSPACE MODAL
───────────────────────────────────────────── */
function CreateWorkspaceModal({ onClose }) {
  const { fetchWithAuth } = useAuth();
  const { refreshOrgs, switchOrg } = useWorkspace();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 100) {
      setError('Name must be at most 100 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/v1/orgs', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      // Refresh the org list (passing the new org's id auto-switches to it),
      // then persist the switch in the backend. Only one refresh call happens here.
      await refreshOrgs(json.org_id);
      await switchOrg(json.org_id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25">
                <Plus size={15} className="text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-white">New Workspace</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors">
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Workspace name</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Engineering"
                maxLength={100}
                className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400"
                >
                  <AlertCircle size={12} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-white/[0.08] hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || name.trim().length < 2 || name.trim().length > 100}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   WORKSPACE SETTINGS MODAL
───────────────────────────────────────────── */
function WorkspaceSettingsModal({ org, onClose, onUpdated, onDeleted }) {
  const { fetchWithAuth } = useAuth();
  const [name, setName] = useState(org.display_name || org.login || '');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleRename = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) { setRenameError('Name must be at least 2 characters.'); return; }
    setRenameLoading(true);
    setRenameError('');
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${org.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      onUpdated?.();
      onClose();
    } catch (err) {
      setRenameError(err.message);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${org.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      onDeleted?.();
      onClose();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Settings size={15} className="text-zinc-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Workspace Settings</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Rename section */}
          <form onSubmit={handleRename} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Rename</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all"
            />
            <AnimatePresence>
              {renameError && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle size={11} />{renameError}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="submit"
              disabled={renameLoading || name.trim() === (org.display_name || org.login || '') || name.trim().length < 2}
              className="w-full py-2 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {renameLoading ? <Loader2 size={13} className="animate-spin" /> : 'Save Name'}
            </button>
          </form>

          <div className="border-t border-white/[0.06]" />

          {/* Delete section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Danger Zone</p>
            <AnimatePresence>
              {deleteError && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle size={11} />{deleteError}
                </motion.p>
              )}
            </AnimatePresence>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full py-2 rounded-lg text-sm font-medium border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={13} />
                Delete Workspace
              </button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <p className="text-xs text-zinc-400 text-center">
                  This permanently deletes <span className="text-white font-medium">{org.display_name || org.login}</span> and all its data. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : 'Delete'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN WorkspaceSwitcher
───────────────────────────────────────────── */
export default function WorkspaceSwitcher() {
  const { currentOrg, orgs, switchOrg, loading, refreshOrgs } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [settingsOrg, setSettingsOrg] = useState(null);

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
    <>
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
                    const canManage = org.role === 'owner' || org.role === 'admin';
                    return (
                      <div
                        key={org.id}
                        className={`flex items-center gap-1 px-2 transition-colors ${isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'}`}
                      >
                        <button
                          onClick={() => { if (!isActive) switchOrg(org.id); setOpen(false); }}
                          className="flex-1 flex items-center gap-3 px-2 py-2.5 text-left"
                        >
                          <div className="size-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                            {org.avatar_url ? (
                              <img src={org.avatar_url} alt="" className="size-5 rounded" />
                            ) : (
                              <Icon className="size-3.5 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{org.display_name || org.login}</p>
                            <p className="text-[10px] text-zinc-600 capitalize">{org.workspace_type}</p>
                          </div>
                          {isActive && <Check className="size-3.5 text-indigo-400 shrink-0" />}
                        </button>
                        {canManage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpen(false); setSettingsOrg(org); }}
                            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] transition-colors shrink-0"
                            title="Workspace settings"
                          >
                            <Settings size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-white/[0.06] px-2 py-2">
                  <button
                    onClick={() => { setOpen(false); setShowCreate(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
                  >
                    <Plus size={13} />
                    New workspace
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateWorkspaceModal
            onClose={() => setShowCreate(false)}
          />
        )}
        {settingsOrg && (
          <WorkspaceSettingsModal
            org={settingsOrg}
            onClose={() => setSettingsOrg(null)}
            onUpdated={() => refreshOrgs()}
            onDeleted={() => refreshOrgs()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
