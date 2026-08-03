import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  GitPullRequest,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

// ─── Status helpers ───────────────────────────────────────────────────────────
function getScoreStyle(score) {
  if (score == null) return { text: 'N/A', color: 'text-zinc-500', bg: 'bg-zinc-800/60', border: 'border-zinc-700/40' };
  if (score >= 80) return { text: `${score}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (score >= 60) return { text: `${score}`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  return { text: `${score}`, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
}

function StatusChip({ status }) {
  const map = {
    completed: { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', Icon: CheckCircle2 },
    analyzing: { label: 'Analyzing', cls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25 animate-pulse', Icon: Loader2 },
    pending:   { label: 'Pending',   cls: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30', Icon: Clock },
    failed:    { label: 'Failed',    cls: 'bg-red-500/15 text-red-400 border-red-500/25', Icon: XCircle },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      <s.Icon className="size-3" />
      {s.label}
    </span>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
    <div className="size-8 rounded-full bg-white/5 animate-pulse shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
      <div className="h-2.5 w-1/3 bg-white/[0.03] rounded animate-pulse" />
    </div>
    <div className="w-16 h-6 bg-white/5 rounded animate-pulse" />
    <div className="w-20 h-5 bg-white/5 rounded-full animate-pulse" />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PullRequestsView() {
  const { fetchWithAuth } = useAuth();
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithAuth('/api/v1/prs');
        if (!res.ok) throw new Error(`Failed to fetch PRs (${res.status})`);
        const json = await res.json();
        setPrs(json.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (fetchWithAuth) load();
  }, [fetchWithAuth]);

  // ── Filtering ──
  const filtered = useMemo(() => {
    // Deduplicate PRs by repository and pull_number, keeping the most recent
    const unique = new Map();
    for (const pr of prs) {
      const key = `${pr.repository_full_name}#${pr.pull_number}`;
      if (!unique.has(key) || new Date(pr.created_at) > new Date(unique.get(key).created_at)) {
        unique.set(key, pr);
      }
    }
    let result = Array.from(unique.values());

    if (statusFilter !== 'all') {
      result = result.filter(pr => pr.analysis_status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        pr =>
          pr.title?.toLowerCase().includes(q) ||
          pr.repository_full_name?.toLowerCase().includes(q) ||
          pr.author_login?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [prs, search, statusFilter]);

  const statuses = ['all', 'completed', 'analyzing', 'pending', 'failed'];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <GitPullRequest className="size-5 text-indigo-400" />
            </div>
            Pull Requests
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {loading ? 'Loading…' : `${prs.length} pull request${prs.length !== 1 ? 's' : ''} across all repositories`}
          </p>
        </div>
      </motion.div>

      {/* ── Filters Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, repo, or author…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-all"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          <Filter className="size-4 text-zinc-600 ml-1.5 shrink-0" />
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden"
      >
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_160px_120px_140px_40px] items-center px-5 py-3 border-b border-white/[0.05] bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-zinc-600">
          <span>Pull Request</span>
          <span>Repository</span>
          <span className="text-center">Score</span>
          <span className="text-center">Status</span>
          <span />
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="size-8 text-red-400 mb-3 opacity-70" />
            <p className="text-sm font-medium text-white mb-1">Failed to load pull requests</p>
            <p className="text-xs text-zinc-500">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GitPullRequest className="size-10 text-zinc-700 mb-4" />
            <p className="text-sm font-medium text-white mb-1">
              {search || statusFilter !== 'all' ? 'No matching pull requests' : 'No pull requests yet'}
            </p>
            <p className="text-xs text-zinc-600">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Pull requests will appear here once your GitHub App is active.'}
            </p>
          </div>
        )}

        {/* Rows */}
        {!loading && !error && filtered.length > 0 && (
          <motion.div variants={container} initial="hidden" animate="show">
            <AnimatePresence>
              {filtered.map((pr) => {
                const score = getScoreStyle(pr.quality_score);
                return (
                  <motion.div key={pr.id} variants={item} layout>
                    <Link
                      to={`/dashboard/prs/${pr.id}`}
                      className="group grid grid-cols-1 md:grid-cols-[1fr_160px_120px_140px_40px] items-center gap-y-2 gap-x-4 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors"
                    >
                      {/* PR Title + author */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-zinc-600">#{pr.pull_number}</span>
                          <span className="text-xs text-zinc-600">·</span>
                          <div className="size-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] text-indigo-400 font-bold shrink-0">
                            {pr.author_login?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <span className="text-xs text-zinc-500">{pr.author_login}</span>
                          <span className="text-xs text-zinc-700 ml-auto md:hidden">
                            {new Date(pr.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate leading-snug">
                          {pr.title}
                        </h3>
                        <p className="text-xs text-zinc-600 mt-0.5 hidden md:block">
                          {new Date(pr.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Repo */}
                      <div className="hidden md:block">
                        <span className="text-xs font-mono text-indigo-300/70 bg-indigo-500/10 px-2 py-0.5 rounded truncate block max-w-[150px]">
                          {pr.repository_full_name}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="hidden md:flex justify-center">
                        <span className={`inline-flex items-baseline gap-0.5 px-2.5 py-1 rounded-lg text-sm font-bold border ${score.color} ${score.bg} ${score.border}`}>
                          {score.text}
                          {pr.quality_score != null && <span className="text-[10px] font-normal opacity-60">/100</span>}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="hidden md:flex justify-center">
                        <StatusChip status={pr.analysis_status} />
                      </div>

                      {/* Arrow */}
                      <div className="hidden md:flex justify-end">
                        <ChevronRight className="size-4 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
