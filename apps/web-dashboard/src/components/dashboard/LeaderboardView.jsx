import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Crown } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceArea, ReferenceLine, ZAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

// ── Quadrant definitions ───────────────────────────────────────────────────────
const QUADRANTS = {
  elite:      { color: '#34d399', glow: '#10b981', bg: 'rgba(52,211,153,0.045)', label: 'Rockstars',  desc: 'High vol · High quality' },
  crafters:   { color: '#818cf8', glow: '#6366f1', bg: 'rgba(129,140,248,0.045)', label: 'Crafters',   desc: 'Low vol · High quality'  },
  shippers:   { color: '#fbbf24', glow: '#f59e0b', bg: 'rgba(251,191,36,0.045)',  label: 'Shippers',   desc: 'High vol · Low quality'  },
  developing: { color: '#f87171', glow: '#ef4444', bg: 'rgba(248,113,113,0.045)', label: 'Growing',    desc: 'Low vol · Low quality'   },
};

const QUALITY_THRESHOLD = 70;

function classify(prCount, avgScore, maxPr) {
  const highVol = prCount > maxPr * 0.5;
  const highQ   = avgScore >= QUALITY_THRESHOLD;
  if (highVol && highQ)  return 'elite';
  if (!highVol && highQ) return 'crafters';
  if (highVol && !highQ) return 'shippers';
  return 'developing';
}

function scoreGradient(score) {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

// ── Custom scatter dot — glowing bubble with name label ────────────────────────
function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const q = QUADRANTS[payload.quadrant] || QUADRANTS.developing;
  const r = Math.max(9, Math.min(22, 7 + (payload.performance_index / 4)));

  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Outer glow aura */}
      <circle cx={cx} cy={cy} r={r + 10} fill={q.glow} opacity={0.08} />
      {/* Ring */}
      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={q.color} strokeWidth={1} opacity={0.3} />
      {/* Main filled dot */}
      <circle cx={cx} cy={cy} r={r} fill={q.color} />
      {/* Specular highlight (3‑D depth cue) */}
      <circle
        cx={cx - r * 0.28}
        cy={cy - r * 0.28}
        r={r * 0.32}
        fill="white"
        opacity={0.22}
      />
      {/* Developer name — offset right; flip left when near right edge */}
      <text
        x={cx + r + 9}
        y={cy + 4}
        fill="#a1a1aa"
        fontSize={10.5}
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight={500}
      >
        {payload.author_login}
      </text>
    </g>
  );
}

// ── Rich hover tooltip ────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const q = QUADRANTS[d.quadrant] || QUADRANTS.developing;

  return (
    <div
      style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)' }}
      className="rounded-2xl p-4 shadow-2xl min-w-[210px] backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <img
            src={`https://github.com/${d.author_login}.png?size=40`}
            alt={d.author_login}
            className="size-9 rounded-full object-cover"
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div
            className="size-9 rounded-full items-center justify-center text-sm font-bold hidden"
            style={{ background: q.bg, color: q.color, border: `1px solid ${q.color}33` }}
          >
            {d.author_login?.[0]?.toUpperCase()}
          </div>
          <span
            className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2"
            style={{ background: q.color, borderColor: '#0f0f11' }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{d.author_login}</p>
          <span className="text-[11px] font-medium" style={{ color: q.color }}>{q.label}</span>
        </div>
      </div>
      <div className="space-y-2 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {[
          ['PR Volume',    d.pr_count,                          '#e4e4e7'],
          ['Avg Quality',  `${d.avg_quality_score?.toFixed(1)}/100`, scoreGradient(d.avg_quality_score)],
          ['Performance',  d.performance_index?.toFixed(2),     q.color],
        ].map(([label, val, clr]) => (
          <div key={label} className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="font-mono font-semibold" style={{ color: clr }}>{val}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 mt-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {q.desc}
      </p>
    </div>
  );
}

// ── Skeleton placeholders ──────────────────────────────────────────────────────
const SkeletonChart = () => (
  <div className="h-[400px] rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse flex items-center justify-center">
    <TrendingUp className="size-8 text-zinc-800" />
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04]">
    <div className="size-7 rounded-lg bg-white/[0.04] animate-pulse" />
    <div className="size-9 rounded-full bg-white/[0.04] animate-pulse" />
    <div className="flex-1 h-3 rounded bg-white/[0.04] animate-pulse" />
    <div className="w-24 h-3 rounded bg-white/[0.04] animate-pulse" />
    <div className="w-16 h-3 rounded bg-white/[0.04] animate-pulse" />
  </div>
);

// ── Medal config for top 3 ────────────────────────────────────────────────────
const MEDALS = [
  { rank: 1, icon: '🥇', ring: 'border-amber-500/40',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  glow: 'shadow-amber-500/20',  size: 'scale-105 z-10' },
  { rank: 2, icon: '🥈', ring: 'border-zinc-500/40',   bg: 'bg-zinc-500/10',   text: 'text-zinc-300',   glow: 'shadow-zinc-400/20',   size: '' },
  { rank: 3, icon: '🥉', ring: 'border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-400', glow: 'shadow-orange-500/20', size: '' },
];
// Podium display order: 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2];

// ── Main component ────────────────────────────────────────────────────────────
export default function LeaderboardView() {
  const { fetchWithAuth } = useAuth();
  const { currentOrg, isCompanyWorkspace } = useWorkspace();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!currentOrg?.id) return;
    setLoading(true);

    async function load() {
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
          const prs = (json.data || []).filter(
            pr => pr.analysis_status === 'completed' && pr.quality_score != null
          );
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

  const sorted = [...data].sort((a, b) => (b.performance_index || 0) - (a.performance_index || 0));
  const maxPr   = Math.max(...data.map(d => d.pr_count || 0), 1);
  const maxPerf = Math.max(...data.map(d => d.performance_index || 0), 1);
  const midX    = maxPr * 0.5;

  // Enrich data with pre-computed quadrant so tooltip + dot share one source of truth
  const enriched = sorted.map(d => ({
    ...d,
    quadrant: classify(d.pr_count, d.avg_quality_score, maxPr),
  }));

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const rowVar    = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Page header ── */}
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
          Developer performance across quality and volume
        </p>
      </motion.div>

      {/* ── Performance Matrix chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
      >
        {/* Card header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Developer Performance Matrix</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Quality score vs PR volume — bubble size reflects performance index</p>
          </div>
          {/* Quadrant legend */}
          {!loading && !error && data.length > 0 && (
            <div className="hidden sm:flex flex-wrap gap-x-5 gap-y-1.5">
              {Object.values(QUADRANTS).map(q => (
                <span key={q.label} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="size-2 rounded-full inline-block shrink-0" style={{ background: q.color }} />
                  {q.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? <SkeletonChart /> : error ? (
          <div className="h-[400px] flex items-center justify-center text-sm text-rose-400">{error}</div>
        ) : data.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-sm text-zinc-600">
            No completed PRs yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 24, right: 60, bottom: 28, left: 16 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.035)" />

              {/* ── Quadrant zone fills ── */}
              <ReferenceArea x1={0} x2={midX} y1={QUALITY_THRESHOLD} y2={100}
                fill={QUADRANTS.crafters.bg}
                label={{ value: 'Crafters', position: 'insideTopLeft', fill: QUADRANTS.crafters.color, fontSize: 10, opacity: 0.55, fontWeight: 600, dy: 4, dx: 6 }}
              />
              <ReferenceArea x1={midX} x2={maxPr * 1.1} y1={QUALITY_THRESHOLD} y2={100}
                fill={QUADRANTS.elite.bg}
                label={{ value: 'Rockstars', position: 'insideTopRight', fill: QUADRANTS.elite.color, fontSize: 10, opacity: 0.55, fontWeight: 600, dy: 4, dx: -6 }}
              />
              <ReferenceArea x1={0} x2={midX} y1={0} y2={QUALITY_THRESHOLD}
                fill={QUADRANTS.developing.bg}
                label={{ value: 'Growing', position: 'insideBottomLeft', fill: QUADRANTS.developing.color, fontSize: 10, opacity: 0.55, fontWeight: 600, dy: -6, dx: 6 }}
              />
              <ReferenceArea x1={midX} x2={maxPr * 1.1} y1={0} y2={QUALITY_THRESHOLD}
                fill={QUADRANTS.shippers.bg}
                label={{ value: 'Shippers', position: 'insideBottomRight', fill: QUADRANTS.shippers.color, fontSize: 10, opacity: 0.55, fontWeight: 600, dy: -6, dx: -6 }}
              />

              {/* ── Divider reference lines ── */}
              <ReferenceLine x={midX} stroke="rgba(255,255,255,0.07)" strokeDasharray="5 5" strokeWidth={1} />
              <ReferenceLine y={QUALITY_THRESHOLD} stroke="rgba(255,255,255,0.07)" strokeDasharray="5 5" strokeWidth={1} />

              {/* ── Axes ── */}
              <XAxis
                type="number"
                dataKey="pr_count"
                name="PR Volume"
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
                label={{ value: 'PR Volume', position: 'insideBottom', offset: -12, fill: '#3f3f46', fontSize: 10.5, fontWeight: 500 }}
              />
              <YAxis
                type="number"
                dataKey="avg_quality_score"
                name="Avg Quality"
                domain={[0, 100]}
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
                label={{ value: 'Avg Quality', angle: -90, position: 'insideLeft', offset: 12, fill: '#3f3f46', fontSize: 10.5, fontWeight: 500 }}
              />
              <ZAxis type="number" dataKey="performance_index" range={[60, 600]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />

              <Scatter data={enriched} shape={<CustomDot />}>
                {enriched.map((entry, idx) => (
                  <Cell key={idx} fill={QUADRANTS[entry.quadrant]?.color || '#818cf8'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {/* Mobile legend */}
        {!loading && !error && data.length > 0 && (
          <div className="flex sm:hidden flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-white/[0.04]">
            {Object.values(QUADRANTS).map(q => (
              <span key={q.label} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className="size-2 rounded-full inline-block" style={{ background: q.color }} />
                {q.label}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Top 3 podium ── */}
      {!loading && !error && sorted.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
            <Crown className="size-3.5 text-amber-500/60" />
            Top Performers
          </h2>
          <div className="grid grid-cols-3 gap-3 items-end">
            {PODIUM_ORDER.map(pos => {
              const dev = sorted[pos];
              if (!dev) return <div key={pos} />;
              const medal = MEDALS[pos];  // 0-indexed in sorted = rank 1, etc.
              const rank  = pos + 1;
              const m     = MEDALS.find(m => m.rank === rank);
              if (!m) return null;
              const isFirst = rank === 1;

              return (
                <motion.div
                  key={dev.author_login}
                  initial={{ opacity: 0, y: isFirst ? 20 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + pos * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative rounded-2xl border p-4 text-center shadow-lg ${m.ring} ${m.bg} ${m.size} ${m.glow} ${isFirst ? 'py-6' : 'py-4'}`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">{m.icon}</div>

                  {/* Avatar */}
                  <div className={`mx-auto mb-3 relative ${isFirst ? 'size-14' : 'size-11'}`}>
                    <img
                      src={`https://github.com/${dev.author_login}.png?size=80`}
                      alt={dev.author_login}
                      className="rounded-full w-full h-full object-cover ring-2"
                      style={{ '--tw-ring-color': QUADRANTS[classify(dev.pr_count, dev.avg_quality_score, maxPr)]?.color + '55' }}
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div
                      className="rounded-full w-full h-full items-center justify-center font-bold text-lg hidden absolute inset-0"
                      style={{
                        background: QUADRANTS[classify(dev.pr_count, dev.avg_quality_score, maxPr)]?.bg,
                        color: QUADRANTS[classify(dev.pr_count, dev.avg_quality_score, maxPr)]?.color,
                      }}
                    >
                      {dev.author_login?.[0]?.toUpperCase()}
                    </div>
                  </div>

                  <p className={`font-semibold truncate ${isFirst ? 'text-sm text-white' : 'text-xs text-zinc-300'}`}>
                    {dev.author_login}
                  </p>

                  <div className="mt-2 space-y-0.5">
                    <p className={`font-bold font-mono ${m.text} ${isFirst ? 'text-xl' : 'text-base'}`}>
                      {dev.performance_index?.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-zinc-600">performance</p>
                  </div>

                  <div className="flex justify-center gap-3 mt-3 text-[10px] text-zinc-500">
                    <span>{dev.pr_count} PRs</span>
                    <span>·</span>
                    <span style={{ color: scoreGradient(dev.avg_quality_score) }}>
                      {dev.avg_quality_score?.toFixed(0)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Full ranked list ── */}
      {!loading && !error && sorted.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.5 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
        >
          {/* Table header */}
          <div className="hidden md:grid items-center px-6 py-3 border-b border-white/[0.05] bg-white/[0.015]"
            style={{ gridTemplateColumns: '52px 1fr 80px 180px 100px' }}>
            {['Rank', 'Developer', 'PRs', 'Avg Quality', 'Index'].map(h => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{h}</span>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : (
            <motion.div variants={container} initial="hidden" animate="show">
              {sorted.map((dev, idx) => {
                const rank  = idx + 1;
                const q     = QUADRANTS[classify(dev.pr_count, dev.avg_quality_score, maxPr)];
                const isTop = rank <= 3;
                const perfPct = Math.min((dev.performance_index / maxPerf) * 100, 100);

                return (
                  <motion.div
                    key={dev.author_login}
                    variants={rowVar}
                    className="hidden md:grid items-center px-6 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group"
                    style={{ gridTemplateColumns: '52px 1fr 80px 180px 100px' }}
                  >
                    {/* Rank badge */}
                    <div>
                      {rank <= 3 ? (
                        <span className="text-lg leading-none select-none">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center size-7 rounded-lg text-xs font-bold border border-white/[0.08] text-zinc-600 bg-white/[0.02]">
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* Developer */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={`https://github.com/${dev.author_login}.png?size=40`}
                          alt={dev.author_login}
                          className="size-8 rounded-full object-cover"
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div
                          className="size-8 rounded-full items-center justify-center text-xs font-bold hidden"
                          style={{ background: q.bg, color: q.color }}
                        >
                          {dev.author_login?.[0]?.toUpperCase()}
                        </div>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0d0d0d]"
                          style={{ background: q.color }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{dev.author_login}</p>
                        <p className="text-[10px] font-medium" style={{ color: q.color }}>{q.label}</p>
                      </div>
                    </div>

                    {/* PR count */}
                    <div>
                      <span className="text-sm font-mono text-zinc-400">{dev.pr_count}</span>
                    </div>

                    {/* Quality score with bar */}
                    <div className="flex items-center gap-2.5 pr-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: scoreGradient(dev.avg_quality_score) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(dev.avg_quality_score || 0, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.25 + idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span
                        className="text-xs font-mono font-semibold w-8 text-right shrink-0"
                        style={{ color: scoreGradient(dev.avg_quality_score) }}
                      >
                        {dev.avg_quality_score?.toFixed(0) || '0'}
                      </span>
                    </div>

                    {/* Performance index */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-white/20"
                          initial={{ width: 0 }}
                          animate={{ width: `${perfPct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="text-xs font-mono shrink-0" style={{ color: q.color }}>
                        {dev.performance_index?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Mobile card list (below md) */}
              {sorted.map((dev, idx) => {
                const rank = idx + 1;
                const q    = QUADRANTS[classify(dev.pr_count, dev.avg_quality_score, maxPr)];
                return (
                  <motion.div
                    key={`mobile-${dev.author_login}`}
                    variants={rowVar}
                    className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0"
                  >
                    <span className="text-base">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : (
                        <span className="text-xs font-bold text-zinc-600 w-5 text-center inline-block">{rank}</span>
                      )}
                    </span>
                    <img
                      src={`https://github.com/${dev.author_login}.png?size=40`}
                      alt={dev.author_login}
                      className="size-8 rounded-full object-cover"
                      onError={e => e.target.src = ''}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{dev.author_login}</p>
                      <p className="text-[10px]" style={{ color: q.color }}>{q.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold" style={{ color: q.color }}>
                        {dev.performance_index?.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-zinc-600">{dev.pr_count} PRs</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty / loading fallback for the list */}
      {loading && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}
    </div>
  );
}
