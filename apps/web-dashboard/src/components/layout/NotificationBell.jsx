import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function NotificationBell() {
  const { fetchWithAuth } = useAuth();
  const [invites, setInvites] = useState([]);
  const [open, setOpen] = useState(false);
  const [responding, setResponding] = useState({});

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/v1/users/me/invites');
      if (res.ok) {
        const json = await res.json();
        setInvites((json.data || []).filter(i => i.status === 'pending'));
      }
    } catch {
      // silently ignore
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 30000);
    return () => clearInterval(interval);
  }, [fetchInvites]);

  const respond = async (id, action) => {
    setResponding(prev => ({ ...prev, [id]: action }));
    try {
      await fetchWithAuth(`/api/v1/invites/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch {
      // silently ignore
    } finally {
      setResponding(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const hasPending = invites.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
      >
        <Bell className="size-4.5 text-zinc-400" />
        {hasPending && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-indigo-500 ring-2 ring-black" />
        )}
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
              className="absolute top-10 right-0 z-20 w-80 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-white">Invitations</p>
              </div>

              {invites.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="size-6 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600">No pending invitations</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {invites.map((invite) => (
                    <motion.div
                      key={invite.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="px-4 py-3 border-b border-white/[0.04] last:border-b-0"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {invite.org_avatar_url ? (
                          <img src={invite.org_avatar_url} alt="" className="size-8 rounded-full" />
                        ) : (
                          <div className="size-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-bold">
                            {invite.org_display_name?.[0]?.toUpperCase() || 'O'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {invite.org_display_name || invite.org_login}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Invited by {invite.inviter_login}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respond(invite.id, 'accept')}
                          disabled={!!responding[invite.id]}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                        >
                          <Check className="size-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => respond(invite.id, 'decline')}
                          disabled={!!responding[invite.id]}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 border border-white/[0.08] hover:bg-white/[0.05] hover:text-rose-400 hover:border-rose-500/25 transition-colors disabled:opacity-50"
                        >
                          <X className="size-3" />
                          Decline
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
