import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  GitPullRequest,
  Calendar,
  Code2,
  FileCode2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  GitBranch,
} from 'lucide-react';

// ─── Severity Badge ──────────────────────────────────────────────────────────
const SeverityBadge = ({ severity }) => {
  const map = {
    CRITICAL: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="size-3.5" /> },
    HIGH:     { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <AlertTriangle className="size-3.5" /> },
    MEDIUM:   { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <AlertTriangle className="size-3.5" /> },
    LOW:      { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Info className="size-3.5" /> },
    INFO:     { color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: <Info className="size-3.5" /> },
  };
  const style = map[severity] || map.INFO;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${style.color}`}>
      {style.icon}
      {severity}
    </span>
  );
};

// ─── Finding Card ─────────────────────────────────────────────────────────────
function FindingCard({ finding, index }) {
  const [expanded, setExpanded] = useState(index < 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-white/5 bg-zinc-900/60 overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <SeverityBadge severity={finding.severity} />
          <span className="font-medium text-white text-sm truncate">{finding.title}</span>
          {finding.category && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-xs bg-white/5 text-zinc-400 border border-white/5">
              {finding.category}
            </span>
          )}
        </div>
        <div className="shrink-0 ml-3 text-zinc-600">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
              {/* Description */}
              <p className="text-sm text-zinc-300 leading-relaxed">{finding.description}</p>

              {/* File location */}
              {finding.file_path && (
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-black/50 rounded-lg px-3 py-2 border border-white/5">
                  <FileCode2 className="size-3.5 shrink-0 text-indigo-400" />
                  <span className="text-zinc-300">{finding.file_path}</span>
                  {finding.line_start && (
                    <span className="ml-auto text-indigo-400 font-semibold">
                      L{finding.line_start}{finding.line_end && finding.line_end !== finding.line_start ? `–${finding.line_end}` : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Suggested fix */}
              {finding.suggested_fix && (
                <div>
                  <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-emerald-400" />
                    AI Suggested Fix
                  </div>
                  <pre className="text-sm bg-black/60 p-4 rounded-lg overflow-x-auto text-emerald-300 font-mono border border-emerald-500/10 whitespace-pre-wrap">
                    {finding.suggested_fix}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const isPassing = score >= 80;
  const isWarning = score >= 60 && score < 80;
  const color = isPassing ? '#34d399' : isWarning ? '#fbbf24' : '#f87171';
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center size-20">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="text-center">
        <div className={`text-xl font-bold`} style={{ color }}>{score}</div>
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider">/100</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PullRequestDetailView() {
  const { id } = useParams();
  const { fetchWithAuth } = useAuth();

  const [prData, setPrData] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPR() {
      try {
        const res = await fetchWithAuth(`/api/v1/prs/${id}`);
        if (!res.ok) throw new Error(`Failed to load PR (${res.status})`);
        const json = await res.json();
        setPrData(json.data.pr);
        setFindings(json.data.findings || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (fetchWithAuth) fetchPR();
  }, [id, fetchWithAuth]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-zinc-500 animate-pulse">Loading pull request…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !prData) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center">
        <XCircle className="mx-auto mb-3 size-10 text-red-400 opacity-70" />
        <h3 className="text-lg font-semibold text-white mb-1">Could Not Load Pull Request</h3>
        <p className="text-sm text-zinc-400 mb-6">{error || 'PR not found'}</p>
        <Link to="/dashboard/prs" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20">
          <ArrowLeft className="size-4" /> Back to Pull Requests
        </Link>
      </div>
    );
  }

  const isPassing = prData.quality_score >= 80;
  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
  const infoCount = findings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length;

  const statCards = [
    { label: 'Critical', count: criticalCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'High', count: highCount, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Medium', count: mediumCount, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Info', count: infoCount, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Back nav */}
      <Link
        to="/dashboard/prs"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Pull Requests
      </Link>

      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-zinc-900/80 to-black/60 backdrop-blur-xl p-6 overflow-hidden"
      >
        {/* ambient glow */}
        <div className={`absolute -top-10 -right-10 size-48 rounded-full blur-3xl opacity-20 ${isPassing ? 'bg-emerald-500' : 'bg-red-500'}`} />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            {/* Repo + PR number breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3 flex-wrap">
              <GitPullRequest className="size-3.5 text-indigo-400" />
              <span className="text-zinc-400 font-medium">{prData.repository_full_name}</span>
              <span className="text-zinc-700">·</span>
              <span className="font-mono text-zinc-400">#{prData.pull_number}</span>
              {prData.analysis_status && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    prData.analysis_status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    prData.analysis_status === 'analyzing' ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' :
                    'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    {prData.analysis_status}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3">
              {prData.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-bold">
                  {prData.author_login?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <span>{prData.author_login}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4" />
                <span>{new Date(prData.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Score Ring */}
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={prData.quality_score ?? 0} />
            <div className={`text-xs font-semibold ${isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPassing ? '✓ Passing' : '✗ Blocked'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── AI Summary (if present) ── */}
      {prData.ai_summary && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5"
        >
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-indigo-300">
            <Sparkles className="size-4" />
            AI Analysis Summary
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{prData.ai_summary}</p>
        </motion.div>
      )}

      {/* ── Stats Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {statCards.map(stat => (
          <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
            <div className="text-3xl font-bold text-white mb-1">{stat.count}</div>
            <div className={`text-sm font-medium ${stat.color}`}>{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Findings ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Code2 className="size-5 text-indigo-400" />
            AI Review Findings
            {findings.length > 0 && (
              <span className="text-sm font-normal text-zinc-500">({findings.length})</span>
            )}
          </h2>
        </div>

        {findings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/5 bg-zinc-900/50 p-12 text-center"
          >
            <CheckCircle2 className="mx-auto mb-4 size-10 text-emerald-400 opacity-70" />
            <h3 className="text-lg font-semibold text-white mb-1">No Issues Found</h3>
            <p className="text-sm text-zinc-400">
              The AI scanner didn't detect any security or quality issues in this pull request.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {findings.map((finding, i) => (
              <FindingCard key={finding.id} finding={finding} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
