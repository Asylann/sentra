import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  BarChart3,
  Star,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';

function getScoreColor(score) {
  if (score == null) return 'text-zinc-500';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

const SkeletonRow = () => (
  <tr className="border-b border-white/[0.04]">
    {[1, 2, 3, 4, 5].map(i => (
      <td key={i} className="px-6 py-4">
        <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${50 + i * 8}%` }} />
      </td>
    ))}
  </tr>
);

export default function RepositoriesView() {
  const { fetchWithAuth } = useAuth();
  const { currentOrg } = useWorkspace();
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState({}); // repoId -> true when in-flight

  // Sync from GitHub API and fetch list with is_linked status.
  const syncAndFetch = useCallback(async () => {
    if (!currentOrg?.id) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/repos/sync`, { method: 'POST' });
      if (!res.ok) throw new Error(`Sync failed (${res.status})`);
      const data = await res.json();
      setRepositories(data.data || []);
    } catch (err) {
      // Sync failed — fall back to plain GET
      try {
        const res2 = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/repos`);
        if (res2.ok) {
          const data = await res2.json();
          setRepositories(data.data || []);
        } else {
          setError(err.message);
        }
      } catch {
        setError(err.message);
      }
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [fetchWithAuth, currentOrg?.id]);

  useEffect(() => {
    if (fetchWithAuth && currentOrg?.id) {
      setLoading(true);
      syncAndFetch();
    }
  }, [fetchWithAuth, currentOrg?.id, syncAndFetch]);

  const handleToggle = async (repo) => {
    const newIsLinked = !repo.is_linked;
    setToggling(prev => ({ ...prev, [repo.id]: true }));
    // Optimistic update
    setRepositories(prev => prev.map(r => r.id === repo.id ? { ...r, is_linked: newIsLinked } : r));
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/repos/${repo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: newIsLinked }),
      });
      if (!res.ok) {
        // Revert on error
        setRepositories(prev => prev.map(r => r.id === repo.id ? { ...r, is_linked: repo.is_linked } : r));
      }
    } catch {
      setRepositories(prev => prev.map(r => r.id === repo.id ? { ...r, is_linked: repo.is_linked } : r));
    } finally {
      setToggling(prev => ({ ...prev, [repo.id]: false }));
    }
  };

  const linkedCount = repositories.filter(r => r.is_linked).length;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const row = {
    hidden: { opacity: 0, x: -8 },
    show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <GitBranch className="size-5 text-emerald-400" />
            </div>
            Repositories
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {loading || syncing
              ? 'Syncing from GitHub…'
              : `${repositories.length} repositor${repositories.length !== 1 ? 'ies' : 'y'} · ${linkedCount} linked to this workspace`}
          </p>
        </div>
        <button
          onClick={syncAndFetch}
          disabled={loading || syncing}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${(loading || syncing) ? 'animate-spin' : ''}`} />
          Sync from GitHub
        </button>
      </motion.div>

      {/* ── Info Banner ── */}
      {!loading && !error && repositories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-sm text-indigo-300"
        >
          <ToggleRight className="size-4 mt-0.5 shrink-0 text-indigo-400" />
          <span>
            Toggle repositories <span className="font-semibold text-white">ON</span> to include them in this workspace's PRs, leaderboard, and metrics.
            Linked repos are highlighted. Repos toggled OFF are ignored in all analytics for this workspace.
          </span>
        </motion.div>
      )}

      {/* ── Table Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden"
      >
        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <AlertTriangle className="size-7 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Failed to Load Repositories</h3>
            <p className="text-sm text-zinc-500 mb-5 max-w-sm">{error}</p>
            <button
              onClick={syncAndFetch}
              className="text-sm text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 px-4 py-2 rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && repositories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="p-4 rounded-full bg-zinc-800/60 border border-white/5 mb-5">
              <GitBranch className="size-8 text-zinc-600" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">No Repositories Found</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-sm">
              Install the GitHub App to connect your repositories, then click "Sync from GitHub".
            </p>
            <a
              href="https://github.com/apps/sentra-devex"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
            >
              <ExternalLink className="size-4" />
              Install GitHub App
            </a>
          </div>
        )}

        {/* Table */}
        {(loading || repositories.length > 0) && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] border-b border-white/[0.05]">
                <tr className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  <th className="px-6 py-3">Repository</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">PRs Analyzed</th>
                  <th className="px-6 py-3">Avg Quality Score</th>
                  <th className="px-6 py-3 text-right">Linked to Workspace</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                ) : (
                  <AnimatePresence>
                    {repositories.map((repo, i) => (
                      <motion.tr
                        key={repo.id}
                        variants={row}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: i * 0.04 }}
                        className={`border-b border-white/[0.04] transition-colors ${repo.is_linked ? 'bg-indigo-500/[0.02]' : 'hover:bg-white/[0.015]'}`}
                      >
                        {/* Repo name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-md ${repo.is_linked ? 'bg-indigo-500/15' : 'bg-white/5'}`}>
                              <GitBranch className={`size-3.5 ${repo.is_linked ? 'text-indigo-400' : 'text-zinc-400'}`} />
                            </div>
                            <div>
                              <div className={`font-medium text-sm ${repo.is_linked ? 'text-white' : 'text-zinc-300'}`}>
                                {repo.full_name}
                              </div>
                              <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
                                {repo.is_private ? (
                                  <span className="inline-flex items-center gap-0.5 text-amber-600/70">
                                    <svg className="size-2.5" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a3 3 0 0 0-3 3v1H3.5A1.5 1.5 0 0 0 2 6.5v7A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 5H11V4a3 3 0 0 0-3-3zm0 1a2 2 0 0 1 2 2v1H6V4a2 2 0 0 1 2-2z"/></svg>
                                    Private
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">Public</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Active status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            repo.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                              : 'bg-zinc-600/20 text-zinc-500 border-zinc-600/30'
                          }`}>
                            {repo.is_active
                              ? <><CheckCircle2 className="size-3" /> Active</>
                              : <><XCircle className="size-3" /> Inactive</>
                            }
                          </span>
                        </td>

                        {/* PRs analyzed */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <BarChart3 className="size-3.5 text-zinc-600" />
                            <span className="font-medium">{repo.total_prs_analyzed ?? 0}</span>
                          </div>
                        </td>

                        {/* Avg quality */}
                        <td className="px-6 py-4">
                          {repo.avg_quality_score != null ? (
                            <div className="flex items-center gap-1.5">
                              <Star className={`size-3.5 ${getScoreColor(repo.avg_quality_score)}`} />
                              <span className={`font-bold text-sm ${getScoreColor(repo.avg_quality_score)}`}>
                                {typeof repo.avg_quality_score === 'number'
                                  ? repo.avg_quality_score.toFixed(1)
                                  : repo.avg_quality_score}
                              </span>
                              <span className="text-zinc-600 text-xs">/100</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs">No data yet</span>
                          )}
                        </td>

                        {/* Toggle */}
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleToggle(repo)}
                              disabled={toggling[repo.id]}
                              className="flex items-center gap-2 group"
                              title={repo.is_linked ? 'Click to unlink from this workspace' : 'Click to link to this workspace'}
                            >
                              {toggling[repo.id] ? (
                                <Loader2 className="size-5 text-zinc-500 animate-spin" />
                              ) : repo.is_linked ? (
                                <ToggleRight className="size-7 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                              ) : (
                                <ToggleLeft className="size-7 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                              )}
                              <span className={`text-xs font-medium hidden sm:inline ${repo.is_linked ? 'text-indigo-400' : 'text-zinc-600'}`}>
                                {repo.is_linked ? 'Linked' : 'Unlinked'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
