import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  BarChart3,
  Star,
  RefreshCw,
} from 'lucide-react';

function getScoreColor(score) {
  if (score == null) return 'text-zinc-500';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

const SkeletonRow = () => (
  <tr className="border-b border-white/[0.04]">
    {[1, 2, 3, 4].map(i => (
      <td key={i} className="px-6 py-4">
        <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
      </td>
    ))}
  </tr>
);

export default function RepositoriesView() {
  const { fetchWithAuth } = useAuth();
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/v1/repositories');
      if (!res.ok) throw new Error(`Failed to fetch repositories (${res.status})`);
      const data = await res.json();
      setRepositories(data.data || []);
    } catch (err) {
      console.error('Failed to fetch repositories', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchWithAuth) fetchRepos();
  }, [fetchWithAuth]);

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
            {loading ? 'Loading…' : `${repositories.length} connected repositor${repositories.length !== 1 ? 'ies' : 'y'}`}
          </p>
        </div>
        <button
          onClick={fetchRepos}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-3 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

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
              onClick={fetchRepos}
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
            <h3 className="text-base font-semibold text-white mb-2">No Repositories Connected</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-sm">
              Connect your GitHub repositories to start getting AI-powered code reviews.
            </p>
            <a
              href="https://github.com/apps/sentra-devex"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
            >
              <ExternalLink className="size-4" />
              Configure GitHub App
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
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-white/5">
                              <GitBranch className="size-3.5 text-zinc-400" />
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm">{repo.full_name}</div>
                              {repo.updated_at && (
                                <div className="text-xs text-zinc-600 mt-0.5">
                                  Last updated {new Date(repo.updated_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <BarChart3 className="size-3.5 text-zinc-600" />
                            <span className="font-medium">{repo.total_prs_analyzed ?? 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {repo.avg_quality_score != null ? (
                            <div className="flex items-center gap-1.5">
                              <Star className={`size-3.5 ${getScoreColor(repo.avg_quality_score)}`} />
                              <span className={`font-bold text-sm ${getScoreColor(repo.avg_quality_score)}`}>
                                {repo.avg_quality_score.toFixed(1)}
                              </span>
                              <span className="text-zinc-600 text-xs">/100</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs">No data yet</span>
                          )}
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
