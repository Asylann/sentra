import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bot } from 'lucide-react';

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800 pb-24">
      {/* Background Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, #111 0%, transparent 60%)' }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <header className="relative z-10 px-8 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <img src="/logo_with_name.png" alt="Sentra" className="h-8" />
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-16 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-8 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
        >
          <Bot className="w-12 h-12 text-indigo-400" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
          className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6"
        >
          The Sentra <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Agent</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-12"
        >
          Our AI agent doesn't just read code—it understands it. Powered by a highly-optimized AI engine, the Sentra Agent deeply integrates into your workflows, learning your team's unique architectural patterns and style preferences to provide superhuman code reviews.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-[#0a0a0a] rounded-xl border border-white/5"
          >
            <h3 className="text-xl font-bold text-white mb-2">Context-Aware Analysis</h3>
            <p className="text-gray-400 text-sm">The agent analyzes your entire repository structure, not just the diff. It understands how a change in one file affects the broader architecture.</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-[#0a0a0a] rounded-xl border border-white/5"
          >
            <h3 className="text-xl font-bold text-white mb-2">Automated Fixes</h3>
            <p className="text-gray-400 text-sm">When bugs or style violations are found, the agent generates precise, ready-to-merge patches that you can apply with a single click.</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
