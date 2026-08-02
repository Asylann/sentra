import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useSentraWS } from '../../context/SentraWSContext';

const StatusDot = ({ status }) => {
  const colors = {
    passed: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]',
    warning: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]',
    blocked: 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]',
    completed: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]',
    analyzing: 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)] animate-pulse',
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status] || colors.passed}`} />;
};

const ScoreSkeleton = () => (
  <div className="flex flex-col items-end">
    <div className="w-16 h-3 bg-white/10 rounded animate-pulse mb-2" />
    <div className="w-12 h-4 bg-white/10 rounded animate-pulse" />
  </div>
);

export default function PullRequestList() {
  const { activePRs } = useSentraWS();

  // Map backend status/qs to our UI statuses if needed, though they already have status
  const getStatusColor = (qs) => {
    if (qs == null) return 'text-gray-500';
    if (qs >= 90) return 'text-emerald-400';
    if (qs >= 80) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getBorderColor = (pr) => {
    if (pr.status === 'analyzing') return 'border-transparent'; // Handled by gradient wrapper
    if (pr.qs == null) return 'border-white/[0.02]';
    if (pr.qs >= 90) return 'border-emerald-500/30';
    if (pr.qs >= 80) return 'border-amber-500/30';
    return 'border-rose-500/30';
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between z-10 bg-[#0a0a0a]/50">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            Live Review Feed
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </h3>
          <p className="text-gray-400 text-sm mt-1">Real-time analysis pipeline</p>
        </div>
        <Link to="/dashboard/prs" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-full">
          View All
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {activePRs.map((pr, i) => {
            const isAnalyzing = pr.status === 'analyzing';
            
            return (
              <motion.div 
                key={pr.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                className="relative rounded-lg overflow-hidden group"
              >
                {/* Shimmering gradient border for 'analyzing' state */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-lg p-[1px] animate-[shimmer_2s_linear_infinite] bg-[length:200%_auto]">
                    <div className="absolute inset-0 bg-[#0a0a0a] rounded-lg" />
                  </div>
                )}

                {/* Main Card Content */}
                <Link to={!isAnalyzing ? `/dashboard/prs/${pr.id}` : '#'} className="block">
                  <div className={`relative p-4 border ${getBorderColor(pr)} hover:bg-white/[0.03] transition-colors flex items-center justify-between gap-4 cursor-pointer bg-[#0a0a0a]/40 rounded-lg ${isAnalyzing ? 'm-[1px]' : ''}`}>
                    
                    <div className="flex items-center gap-4 min-w-0">
                      <StatusDot status={isAnalyzing ? 'analyzing' : (pr.qs >= 90 ? 'passed' : pr.qs >= 80 ? 'warning' : 'blocked')} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-indigo-300/80 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            {pr.repo}
                          </span>
                          <span className="text-xs text-gray-500">{pr.time}</span>
                          {isAnalyzing && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 animate-pulse bg-indigo-500/10 px-1.5 py-0.5 rounded">
                              Analyzing...
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm text-gray-200 font-medium truncate group-hover:text-white transition-colors">
                          {pr.title || `Pull Request #${pr.id.split('#')[1] || pr.id}`}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {isAnalyzing ? (
                        <ScoreSkeleton />
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-right"
                        >
                          <div className="text-xs text-gray-500 mb-1">Quality Score</div>
                          <div className={`text-sm font-bold font-mono ${getStatusColor(pr.qs)}`}>
                            {pr.qs} / 100
                          </div>
                        </motion.div>
                      )}
                      
                      <div className="size-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-medium text-gray-300 relative overflow-hidden">
                        {pr.author ? pr.author.charAt(0).toUpperCase() : '?'}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-indigo-500/20 animate-pulse" />
                        )}
                      </div>
                    </div>

                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
