import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Mail, GitBranch, X, Check, Shield, Zap,
  Building2, Code2, Sparkles, Crown,
  Clock, AlertCircle, Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

/* ─────────────────────────────────────────────
   ANIMATED BANNER — "Company × Developers"
───────────────────────────────────────────── */
function FloatingOrb({ x, y, size, color, delay }) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color }}
      animate={{ y: [0, -20, 0], x: [0, 10, 0], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

function PulsingLine({ x1, y1, x2, y2, color, delay }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      <motion.line
        x1={`${x1}%`} y1={`${y1}%`}
        x2={`${x2}%`} y2={`${y2}%`}
        stroke={color} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.25}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay, ease: 'easeOut' }}
      />
      <motion.circle r={3} fill={color} opacity={0.8}
        animate={{
          cx: [`${x1}%`, `${x2}%`],
          cy: [`${y1}%`, `${y2}%`],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay }}
      />
    </svg>
  );
}

function CollaborationBanner() {
  const devProfiles = [
    { initials: 'AK', color: '#818cf8' },
    { initials: 'MJ', color: '#34d399' },
    { initials: 'ST', color: '#f59e0b' },
    { initials: 'LR', color: '#f472b6' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0d0d14] via-[#0a0a12] to-[#0d0d14] p-8 mb-8"
    >
      <FloatingOrb x={80} y={10} size={200} color="rgba(99,102,241,0.4)" delay={0} />
      <FloatingOrb x={10} y={60} size={160} color="rgba(52,211,153,0.25)" delay={1.5} />
      <FloatingOrb x={50} y={80} size={120} color="rgba(245,158,11,0.2)" delay={3} />

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        {/* Left text */}
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-medium mb-4"
          >
            <Sparkles size={12} />
            Company Workspace
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-2xl md:text-3xl font-bold text-white leading-snug mb-3"
          >
            Build great software{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              together
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-md"
          >
            Invite your developers into this company workspace. Sentra AI reviews every pull request,
            tracks quality scores, and surfaces insights — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-wrap gap-2"
          >
            {[
              { icon: Shield, label: 'AI Security Review', color: '#818cf8' },
              { icon: Zap, label: 'Quality Leaderboard', color: '#f59e0b' },
              { icon: Code2, label: 'PR Insights', color: '#34d399' },
            ].map(({ icon: Icon, label, color }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{
                  background: color + '15',
                  borderColor: color + '30',
                  color: color,
                }}
              >
                <Icon size={11} />
                {label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right — animated node diagram */}
        <div className="relative flex-shrink-0 w-64 h-48 hidden md:block">
          <PulsingLine x1={50} y1={50} x2={20} y2={15} color="#818cf8" delay={0.8} />
          <PulsingLine x1={50} y1={50} x2={80} y2={15} color="#34d399" delay={1.1} />
          <PulsingLine x1={50} y1={50} x2={15} y2={80} color="#f59e0b" delay={1.4} />
          <PulsingLine x1={50} y1={50} x2={85} y2={80} color="#f472b6" delay={1.7} />

          {/* Central Sentra node */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute flex flex-col items-center gap-1.5"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              animate={{ boxShadow: ['0 0 0px #818cf840', '0 0 24px #818cf860', '0 0 0px #818cf840'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="size-12 rounded-2xl border flex items-center justify-center"
              style={{ background: '#818cf815', borderColor: '#818cf830' }}
            >
              <Sparkles size={20} style={{ color: '#818cf8' }} />
            </motion.div>
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#818cf8cc' }}>
              Sentra AI
            </span>
          </motion.div>

          {/* Dev nodes */}
          {devProfiles.map((dev, i) => {
            const positions = [[20, 15], [80, 15], [15, 80], [85, 80]];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute size-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{
                  left: `${positions[i][0]}%`,
                  top: `${positions[i][1]}%`,
                  transform: 'translate(-50%, -50%)',
                  borderColor: dev.color + '50',
                  background: dev.color + '20',
                  color: dev.color,
                }}
              >
                {dev.initials}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   INVITE MODAL
───────────────────────────────────────────── */
function InviteModal({ orgId, onClose, onSuccess }) {
  const { fetchWithAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [githubLogin, setGithubLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${orgId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), github_login: githubLogin.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Error ${res.status}`);
      }
      setSent(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1800);
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
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25">
                  <UserPlus size={16} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Invite Developer</h3>
              </div>
              <p className="text-xs text-zinc-500">They'll receive an invitation they can accept or decline.</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center gap-3 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
                >
                  <Check size={24} className="text-emerald-400" />
                </motion.div>
                <p className="text-sm font-medium text-white">Invitation sent!</p>
                <p className="text-xs text-zinc-500">{email}</p>
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Email address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@company.com"
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    GitHub username{' '}
                    <span className="text-zinc-600 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <GitBranch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="text"
                      value={githubLogin}
                      onChange={(e) => setGithubLogin(e.target.value)}
                      placeholder="octocat"
                      className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400"
                    >
                      <AlertCircle size={13} className="shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-lg text-sm text-zinc-400 border border-white/[0.08] hover:bg-white/[0.04] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    id="send-invite-btn"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} />Send Invite</>}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MEMBER CARD
───────────────────────────────────────────── */
function MemberCard({ member, index }) {
  const ROLE_STYLES = {
    owner: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    admin: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    member: 'text-zinc-400 bg-white/[0.04] border-white/[0.08]',
  };
  const roleStyle = ROLE_STYLES[member.role] || ROLE_STYLES.member;

  const joinedDate = member.joined_at
    ? new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const colors = ['#818cf8', '#34d399', '#f59e0b', '#f472b6', '#60a5fa', '#a78bfa', '#fb923c'];
  const colorIdx = (member.login || 'u').charCodeAt(0) % colors.length;
  const avatarColor = colors[colorIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
    >
      <div className="relative shrink-0">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.login} className="size-10 rounded-full ring-1 ring-white/10" />
        ) : (
          <div
            className="size-10 rounded-full flex items-center justify-center text-sm font-bold ring-1 ring-white/10"
            style={{ background: avatarColor + '20', color: avatarColor }}
          >
            {(member.name || member.login || 'U')[0].toUpperCase()}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-[#111]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{member.name || member.login}</p>
        <p className="text-xs text-zinc-500 truncate">@{member.login}</p>
      </div>

      <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${roleStyle}`}>
        {member.role === 'owner' && <Crown size={10} />}
        {member.role}
      </span>

      {joinedDate && (
        <div className="hidden md:flex items-center gap-1 text-xs text-zinc-600">
          <Clock size={11} />
          {joinedDate}
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   PENDING INVITE ROW
───────────────────────────────────────────── */
function PendingInviteRow({ invite, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-amber-500/10"
    >
      <Mail size={14} className="text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 truncate">{invite.target_email}</p>
        {invite.target_github_login && (
          <p className="text-xs text-zinc-600">@{invite.target_github_login}</p>
        )}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
        pending
      </span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN TeamView
───────────────────────────────────────────── */
export default function TeamView() {
  const { fetchWithAuth } = useAuth();
  const { currentOrg, isCompanyWorkspace } = useWorkspace();

  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!currentOrg?.id) return;
    setLoadingMembers(true);
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/members`);
      if (res.ok) {
        const json = await res.json();
        setMembers(json.data || []);
      }
    } catch { /* silent */ } finally {
      setLoadingMembers(false);
    }
  }, [fetchWithAuth, currentOrg?.id]);

  const fetchPendingInvites = useCallback(async () => {
    if (!currentOrg?.id) return;
    setLoadingInvites(true);
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/invites/pending`);
      if (res.ok) {
        const json = await res.json();
        setPendingInvites(json.data || []);
      }
    } catch { /* silent */ } finally {
      setLoadingInvites(false);
    }
  }, [fetchWithAuth, currentOrg?.id]);

  useEffect(() => {
    fetchMembers();
    fetchPendingInvites();
  }, [fetchMembers, fetchPendingInvites]);

  const filtered = members.filter(
    (m) => !search ||
      m.login?.toLowerCase().includes(search.toLowerCase()) ||
      m.name?.toLowerCase().includes(search.toLowerCase()),
  );

  /* Personal workspace gate */
  if (!isCompanyWorkspace) {
    return (
      <div className="max-w-4xl mx-auto">
        <CollaborationBanner />
        <div className="text-center py-16">
          <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
            <Building2 size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Company workspace required</h2>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Switch to a company workspace from the top‑left dropdown to manage your team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CollaborationBanner />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Users size={18} className="text-indigo-400" />
            </div>
            Team Members
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {loadingMembers ? '…' : `${members.length} member${members.length !== 1 ? 's' : ''}`} in{' '}
            <span className="text-zinc-400">{currentOrg?.display_name || currentOrg?.login}</span>
          </p>
        </div>

        <button
          id="invite-member-btn"
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <UserPlus size={15} />
          Invite Developer
        </button>
      </motion.div>

      {/* Search */}
      <motion.input
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search members by name or GitHub username…"
        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all"
      />

      {/* Members list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02] flex items-center gap-2">
          <Users size={14} className="text-zinc-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Members</span>
          {!loadingMembers && (
            <span className="ml-auto text-xs text-zinc-700">{filtered.length} shown</span>
          )}
        </div>

        <div className="p-3 space-y-2">
          {loadingMembers ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl animate-pulse">
                <div className="size-10 rounded-full bg-white/[0.04]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-white/[0.04] rounded" />
                  <div className="h-2 w-20 bg-white/[0.03] rounded" />
                </div>
                <div className="h-6 w-16 bg-white/[0.04] rounded-lg" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={28} className="text-zinc-800 mx-auto mb-3" />
              <p className="text-sm text-zinc-600">
                {search ? 'No members match your search.' : 'No members yet — invite your first developer!'}
              </p>
            </div>
          ) : (
            filtered.map((member, idx) => (
              <MemberCard key={member.user_id || member.login || idx} member={member} index={idx} />
            ))
          )}
        </div>
      </motion.div>

      {/* Pending Invites */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-amber-500/[0.08] flex items-center gap-2">
          <Clock size={14} className="text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600/80">
            Pending Invitations
          </span>
          {pendingInvites.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold">
              {pendingInvites.length}
            </span>
          )}
        </div>
        <div className="p-3 space-y-2">
          {loadingInvites ? (
            <div className="py-6 text-center text-xs text-zinc-600 animate-pulse">Loading…</div>
          ) : pendingInvites.length === 0 ? (
            <div className="py-6 text-center">
              <Mail size={20} className="text-zinc-800 mx-auto mb-2" />
              <p className="text-xs text-zinc-700">No pending invitations</p>
            </div>
          ) : (
            pendingInvites.map((invite, idx) => (
              <PendingInviteRow key={invite.id} invite={invite} index={idx} />
            ))
          )}
        </div>
      </motion.div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal
            orgId={currentOrg?.id}
            onClose={() => setShowInviteModal(false)}
            onSuccess={() => { fetchMembers(); fetchPendingInvites(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
