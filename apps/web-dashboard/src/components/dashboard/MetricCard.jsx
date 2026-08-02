import React from 'react';
import { motion } from 'framer-motion';

export default function MetricCard({ title, value, trend, isPositive }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 backdrop-blur-2xl transition-colors duration-500 hover:bg-white/[0.04] hover:border-white/[0.08]"
    >
      <h3 className="text-gray-400 text-sm font-medium mb-3">{title}</h3>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-semibold text-white tracking-tight">{value}</div>
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7L17 17M17 17H7M17 17V7" />
            </svg>
          )}
          {trend}
        </div>
      </div>
    </motion.div>
  );
}
