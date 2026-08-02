import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';

export default function AboutPage() {
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
          className="inline-flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-8"
        >
          <Users className="w-12 h-12 text-emerald-400" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
        >
          About Sentra
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
        >
          We believe that code reviews shouldn't be a bottleneck. Our mission is to empower developers to ship high-quality, secure code at the speed of thought. By combining state-of-the-art AI with deep developer tooling integrations, Sentra acts as your team's ultimate force multiplier.
        </motion.p>
      </main>
    </div>
  );
}
