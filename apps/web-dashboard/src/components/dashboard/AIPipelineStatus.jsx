import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSentraWS } from '../../context/SentraWSContext';

const baseServices = [
  { name: 'API Gateway', status: 'healthy', latency: '4ms' },
  { name: 'Kafka Broker', status: 'healthy', latency: '12ms' },
  { name: 'Primary AI Model', status: 'healthy', latency: '850ms' },
  { name: 'pgvector RAG', status: 'healthy', latency: '45ms' },
];

export default function AIPipelineStatus() {
  const { lastMessage, isConnected } = useSentraWS();
  const [prStatus, setPrStatus] = useState(null); // null, 'analyzing', 'completed'
  const [prDetails, setPrDetails] = useState(null);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.status === 'analyzing') {
        setPrStatus('analyzing');
        setPrDetails(lastMessage);
      } else if (lastMessage.status === 'completed') {
        setPrStatus('completed');
        setPrDetails(lastMessage);
        
        // Clear after 10s
        setTimeout(() => {
          setPrStatus(null);
          setPrDetails(null);
        }, 10000);
      }
    }
  }, [lastMessage]);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl p-6 h-full flex flex-col relative overflow-hidden">
      
      {/* Background glow when analyzing */}
      <AnimatePresence>
        {prStatus === 'analyzing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -inset-4 bg-indigo-500/10 blur-xl pointer-events-none" 
          />
        )}
      </AnimatePresence>

      <div className="mb-6 flex items-start justify-between relative z-10">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            System Telemetry
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
          </h3>
          <p className="text-gray-400 text-sm mt-1">Sentra AI Engine Health</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 relative z-10">
        <AnimatePresence mode="wait">
          {prStatus === 'analyzing' ? (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col items-center justify-center py-6"
            >
              <div className="relative w-16 h-16 mb-4">
                <motion.div 
                  className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"
                />
                <motion.div 
                  className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <p className="text-indigo-400 font-medium">Thinking...</p>
              <p className="text-gray-400 text-sm mt-2 text-center">
                Analyzing PR #{prDetails?.pr_number} in {prDetails?.repo}
              </p>
            </motion.div>
          ) : prStatus === 'completed' ? (
            <motion.div 
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-6"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-white text-lg font-medium">Analysis Complete</h4>
              <div className="flex gap-4 mt-4">
                <div className="bg-white/[0.05] rounded-lg px-4 py-2 text-center">
                  <span className="block text-2xl font-mono text-emerald-400">{prDetails?.quality_score}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Score</span>
                </div>
                <div className="bg-white/[0.05] rounded-lg px-4 py-2 text-center">
                  <span className="block text-2xl font-mono text-amber-400">{prDetails?.finding_count}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Findings</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {baseServices.map((service, i) => (
                <div key={service.name} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">{service.name}</span>
                    <span className="text-xs font-mono text-gray-500">{service.latency}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
                      className="h-full bg-emerald-500/80 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 pt-6 border-t border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Token Budget (24h)</span>
          <span className="text-xs text-indigo-400 font-mono">1.2M / 2.0M</span>
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '60%' }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          />
        </div>
      </div>
    </div>
  );
}
