import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Users } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

function getQuadrantColor(prCount, avgScore, maxPr) {
  const highVol = prCount > maxPr * 0.5;
  const highQuality = avgScore >= 70;
  if (highVol && highQuality) return '#34d399';
  if (!highVol && highQuality) return '#818cf8';
  if (highVol && !highQuality) return '#fbbf24';
  return '#f87171';
}

function getRankAccent(rank) {
  if (rank === 1) return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
  if (rank === 2) return 'text-zinc-300 bg-zinc-400/10 border-zinc-400/25';
  if (rank === 3) return 'text-orange-400 bg-orange-500/10 border-orange-500/25';
  return 'text-zinc-600 bg-white/[0.03] border-white/[0.06]';
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{data.author_login}</p>
      <p className="text-xs text-zinc-400 mt-1">PRs: {data.pr_count}</p>
      <p className="text-xs text-zinc-400">Avg Score: {data.avg_quality_score?.toFixed(1)}</p>
      <p className="text-xs text-zinc-400">Performance: {data.performance_index?.toFixed(2)}</p>
    </div>
  );
}

const SkeletonChart = () => (
  <div className="h-[300px] bg-white/[0.02] rounded-xl border border-white/[0.06] animate-pulse flex items-center justify-center">
    <TrendingUp className="size-8 text-zinc-800" />
  </div>
);

export default function LeaderboardView() {
  const { fetchWithAuth } = useAuth();
  const { currentOrg, isCompanyWorkspace } = useWorkspace();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentOrg?.id) return;

    async function load() {
      setLoading(true);
      try {
        if (isCompanyWorkspace) {
          const res = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/leaderboard`);
          if (!res.ok) throw new Error(`Failed to load leaderboard (${res.status})`);
          const json = await res.json();
          setData(json.data || []);
        } else {
          const res = await fetchWithAuth('/api/v1/prs');
          if (!res.ok) throw new Error(`Failed to load PRs (${res.status})`);
          const json = await res.json();
          const prs = (json.data || []).filter(pr => pr.analysis_status === 'completed' && pr.quality_score != null);
          const grouped = {};
          for (const pr of prs) {
            const login = pr.author_login || 'unknown';
            if (!grouped[login]) grouped[login] = { scores: [], count: 0 };
            grouped[login].scores.push(pr.quality_score);
            grouped[login].count++;
          }
          const computed = Object.entries(grouped).map(([login, d]) => {
            const avg = d.scores.reduce((a, b) => a + b, 0) / d.scores.length;
            return {
              author_login: login,
              pr_count: d.count,
              avg_quality_score: avg,
              performance_index: avg * Math.log(d.count + 1),
            };
          });
          computed.sort((a, b) => b.performance_index - a.performance_index);
          setData(computed);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchWithAuth, currentOrg?.id, isCompanyWorkspace]);

  const maxPr = Math.max(...data.map(d => d.pr_count || 0), 1);
  const sorted = [...data].sort((a, b) => (b.performance_index || 0) - (a.performance_index || 0));

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };


  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Trophy className="size-5 text-amber-400" />
          </div>
          Engineering Leaderboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Performance across your organization
        </p>
      </motion.div>

      {/* Scatter Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
      >
        {loading ? (
          <SkeletonChart />
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-rose-400">{error}</div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-zinc-600">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                type="number"
                dataKey="pr_count"
                name="PR Volume"
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                label={{ value: 'PR Volume', position: 'bottom', fill: '#52525b', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="avg_quality_score"
                name="Avg Quality"
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                domain={[0, 100]}
                label={{ value: 'Avg Quality Score', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Scatter data={data} fill="#818cf8">
                {data.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={getQuadrantColor(entry.pr_count, entry.avg_quality_score, maxPr)}
                    r={6}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        {!loading && !error && data.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/[0.04]">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="size-2.5 rounded-full bg-emerald-400" /> High Volume + High Quality
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="size-2.5 rounded-full bg-indigo-400" /> Low Volume + High Quality
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="size-2.5 rounded-full bg-amber-400" /> High Volume + Low Quality
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="size-2.5 rounded-full bg-rose-400" /> Low Volume + Low Quality
            </span>
          </div>
        )}
      </motion.div>

      {/* Ranked List */}
      {!loading && !error && sorted.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
        >
          {/* Header */}
          <div className="hidden md:grid grid-cols-[60px_1fr_100px_160px_100px] items-center px-5 py-3 border-b border-white/[0.05] bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-zinc-600">
            <span>Rank</span>
            <span>Developer</span>
            <span className="text-center">PRs</span>
            <span className="text-center">Avg Quality</span>
            <span className="text-center">Index</span>
          </div>

          <motion.div variants={container} initial="hidden" animate="show">
            {sorted.map((dev, idx) => {
              const rank = idx + 1;
              const accent = getRankAccent(rank);
              const scoreWidth = Math.min((dev.avg_quality_score || 0), 100);

              return (
                <motion.div
                  key={dev.author_login}
                  variants={item}
                  className="grid grid-cols-[60px_1fr_100px_160px_100px] items-center px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Rank */}
                  <div>
                    <span className={`inline-flex items-center justify-center size-7 rounded-lg text-xs font-bold border ${accent}`}>
                      {rank}
                    </span>
                  </div>

                  {/* Developer */}
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-bold shrink-0">
                      {dev.author_login?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-zinc-200 truncate">{dev.author_login}</span>
                  </div>

                  {/* PR Count */}
                  <div className="text-center">
                    <span className="text-sm font-mono text-zinc-400">{dev.pr_count}</span>
                  </div>

                  {/* Quality Bar */}
                  <div className="flex items-center gap-2 px-2">
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700"
                        style={{ width: `${scoreWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-400 w-8 text-right">
                      {dev.avg_quality_score?.toFixed(0) || '0'}
                    </span>
                  </div>

                  {/* Performance Index */}
                  <div className="text-center">
                    <span className="text-sm font-mono text-emerald-400/80">
                      {dev.performance_index?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
