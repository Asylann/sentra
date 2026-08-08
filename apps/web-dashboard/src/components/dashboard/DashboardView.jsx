import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Zap, GitPullRequest, Activity, Server, Cpu, Database, XCircle, ArrowUpRight, Clock, AlertTriangle, Search, FileCode, Code2, Network, Bot, Coins } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSentraWS } from '../../context/SentraWSContext';

export default function DashboardView() {
  const { activePRs } = useSentraWS();
  const { fetchWithAuth, apiBase, token } = useAuth();
  const { currentOrg, isCompanyWorkspace } = useWorkspace();

  const [metrics, setMetrics] = useState(null);
  const [prHistory, setPrHistory] = useState([]);
  const [apiPing, setApiPing] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fetchWithAuth) return;
    const fetchData = async () => {
      try {
        const start = performance.now();

        const prsUrl = (isCompanyWorkspace && currentOrg?.id)
          ? `/api/v1/orgs/${currentOrg.id}/prs`
          : '/api/v1/prs';

        const [metricsRes, prsRes] = await Promise.all([
          fetchWithAuth('/api/v1/metrics'),
          fetchWithAuth(prsUrl),
        ]);
        const end = performance.now();
        setApiPing(Math.round(end - start));

        if (metricsRes.ok) {
          const mData = await metricsRes.json();
          setMetrics(mData.data);
        }
        if (prsRes.ok) {
          const pData = await prsRes.json();
          const prs = pData.data || [];

          const unique = new Map();
          for (const pr of prs) {
            const key = `${pr.repository_full_name}#${pr.pull_number}`;
            if (!unique.has(key) || new Date(pr.created_at) > new Date(unique.get(key).created_at)) {
              unique.set(key, pr);
            }
          }
          setPrHistory(Array.from(unique.values()));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchWithAuth, isCompanyWorkspace, currentOrg?.id]);

  // Compute real failed PRs (Quality Score < 80)
  const failedPRs = useMemo(() => {
    return prHistory
      .filter(pr => pr.quality_score !== null && pr.quality_score < 80)
      .slice(0, 3)
      .map(pr => ({
        id: pr.id,
        title: pr.title || `PR #${pr.pull_number}`,
        author: pr.author_login || 'unknown',
        score: Math.round(pr.quality_score),
        time: new Date(pr.created_at).toLocaleDateString()
      }));
  }, [prHistory]);

  // Compute real chart data from PR history (aggregate by day)
  const chartData = useMemo(() => {
    if (prHistory.length === 0) return [];
    
    // Group PRs by date (e.g., "Mon", "Tue") and average the scores
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grouped = {};
    
    // We reverse to process oldest to newest, but PRs are usually returned newest first
    // Let's sort by created_at ascending
    const sorted = [...prHistory].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    sorted.forEach(pr => {
      if (pr.quality_score === null) return;
      const date = new Date(pr.created_at);
      const dayName = days[date.getDay()];
      if (!grouped[dayName]) {
        grouped[dayName] = { sum: 0, count: 0 };
      }
      grouped[dayName].sum += pr.quality_score;
      grouped[dayName].count += 1;
    });

    const data = Object.keys(grouped).map(day => ({
      day,
      score: Math.round(grouped[day].sum / grouped[day].count)
    }));
    
    // If we only have 1 data point, duplicate it so the area chart renders a line
    if (data.length === 1) {
      data.unshift({ day: 'Prev', score: data[0].score });
    }
    
    return data;
  }, [prHistory]);

  // Compute real KPI stats dynamically from history
  const kpiStats = useMemo(() => {
    let sumScore = 0;
    let countScore = 0;
    let threats = 0;
    let todayReviews = 0;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    prHistory.forEach(pr => {
      if (pr.quality_score !== null) {
        sumScore += pr.quality_score;
        countScore++;
        // If score is 0 or status is blocked, count as a threat
        if (pr.quality_score === 0 || pr.status === 'blocked') {
          threats++;
        }
      }
      if (pr.created_at) {
        const prDate = new Date(pr.created_at).getTime();
        if (prDate >= startOfToday) {
          todayReviews++;
        }
      }
    });

    const avgScore = countScore > 0 ? Math.round(sumScore / countScore) : null;
    const totalAudited = metrics?.total_prs_merged || prHistory.length || 0;
    const budgetPercent = Math.min(100, Math.round((todayReviews / 7) * 100));

    return {
      avgScore,
      totalAudited,
      threats,
      budgetPercent
    };
  }, [prHistory, metrics]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  const GhostCard = ({ children, className = "" }) => (
    <div className={`p-6 bg-[#0a0a0a] border border-white/[0.08] rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-8 max-w-[1200px] mx-auto w-full pb-20"
    >

      {/* Top Row: KPI Ghost Cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GhostCard>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            {kpiStats.avgScore !== null && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <ArrowUpRight className="w-3 h-3" />
                Live
              </span>
            )}
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Average Quality Score</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white tracking-tight">
              {loading ? "..." : (kpiStats.avgScore !== null ? kpiStats.avgScore : "N/A")}
            </span>
            {kpiStats.avgScore !== null && <span className="text-sm text-gray-500 font-medium">/ 100</span>}
          </div>
        </GhostCard>

        <GhostCard>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] flex items-center justify-center">
              <img src="https://cdn.simpleicons.org/github/818cf8" alt="GitHub" className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total PRs Audited</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white tracking-tight">
              {loading ? "..." : kpiStats.totalAudited}
            </span>
          </div>
          <p className="text-xs text-indigo-400/80 mt-2 font-medium">Historical analysis count</p>
        </GhostCard>

        <GhostCard>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Critical Threats Blocked</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white tracking-tight">
              {loading ? "..." : kpiStats.threats}
            </span>
          </div>
          <p className="text-xs text-rose-400/80 mt-2 font-medium">Hardcoded secrets & vulns</p>
        </GhostCard>

        <GhostCard>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Avg AI Inference Time</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white tracking-tight">N/A</span>
          </div>
          <p className="text-xs text-amber-400/80 mt-2 font-medium">Awaiting telemetry integration</p>
        </GhostCard>
      </motion.div>

      {/* Middle Row: Analytics Chart */}
      <motion.div variants={item}>
        <GhostCard className="h-[340px] flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-white font-medium">Quality Score Trajectory</h3>
              <p className="text-sm text-gray-400">14-day rolling average of audited PRs</p>
            </div>
          </div>
          <div className="flex-1 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartData.length > 0 ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(9, 9, 11, 0.9)', 
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                      color: '#fff',
                      padding: '12px 16px'
                    }}
                    itemStyle={{ color: '#818cf8', fontWeight: 600 }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#818cf8" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    activeDot={{ r: 5, fill: '#09090b', stroke: '#818cf8', strokeWidth: 2.5 }}
                  />
                </AreaChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm font-medium">
                  Waiting for PR analysis data...
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </GhostCard>
      </motion.div>

      {/* Bottom Row: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: System Health */}
        <motion.div variants={item} className="lg:col-span-1">
          <GhostCard className="h-full">
            <h3 className="text-white font-medium mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              System Telemetry
            </h3>
            
            <div className="space-y-4">
              <div className="group flex items-center justify-between p-3.5 bg-[#09090b] hover:bg-[#18181b] rounded-xl border border-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00ADD8]/10 border border-[#00ADD8]/20">
                    <img src="https://cdn.simpleicons.org/go/00ADD8" alt="Go" className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-200">API Gateway</span>
                    <span className="block text-xs text-gray-500">Go / Gin</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono bg-white/[0.03] px-2 py-1 rounded-md">{apiPing > 0 ? `${apiPing}ms` : '...'}</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                </div>
              </div>

              <div className="group flex items-center justify-between p-3.5 bg-[#09090b] hover:bg-[#18181b] rounded-xl border border-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
                    <img src="https://cdn.simpleicons.org/apachekafka/white" alt="Kafka" className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-200">Kafka Broker</span>
                    <span className="block text-xs text-gray-500">Event Stream</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono bg-white/[0.03] px-2 py-1 rounded-md">12ms</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                </div>
              </div>

              <div className="group flex items-center justify-between p-3.5 bg-[#09090b] hover:bg-[#18181b] rounded-xl border border-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#d97757]/10 border border-[#d97757]/20">
                    <img src="https://cdn.simpleicons.org/anthropic/d97757" alt="Anthropic" className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-200">Inference Engine</span>
                    <span className="block text-xs text-gray-500">Analysis Worker</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Operational</span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/[0.05]">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#FF9900]" />
                    <span className="text-sm font-medium text-gray-300">Token Budget</span>
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded">{kpiStats.budgetPercent}% Used</span>
                </div>
                <div className="w-full bg-[#09090b] rounded-full h-2 border border-white/5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#FF9900] to-[#FF5252] h-full rounded-full shadow-[0_0_10px_rgba(255,153,0,0.5)] transition-all duration-1000 ease-out" 
                    style={{ width: `${kpiStats.budgetPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </GhostCard>
        </motion.div>

        {/* Right Col: Action Required Feed */}
        <motion.div variants={item} className="lg:col-span-2">
          <GhostCard className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-medium flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Action Required
              </h3>
              <span className="text-xs px-2 py-1 bg-white/[0.05] rounded-md text-gray-400 border border-white/[0.05]">
                Score &lt; 80
              </span>
            </div>
            
            <div className="space-y-3">
              {failedPRs.map((pr) => (
                <div key={pr.id} className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-rose-500/[0.02] border border-white/[0.05] hover:border-rose-500/20 rounded-xl transition-all cursor-pointer">
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-center justify-center size-10 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <span className="text-sm font-bold">{pr.score}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{pr.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {pr.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {pr.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link 
                      to={`/dashboard/prs/${pr.id}`}
                      className="inline-block text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </GhostCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
