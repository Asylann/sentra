import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Headphones, Phone } from 'lucide-react';

export default function SupportPage() {
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
          className="inline-flex items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-8"
        >
          <Headphones className="w-12 h-12 text-rose-400" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
        >
          Sentra Support
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed space-y-8"
        >
          <p>
            Having trouble? Our technical support team is ready to help you get the most out of your AI-powered code reviews.
          </p>

          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-xl">
            <h2 className="text-xl font-medium text-white mb-4">Contact Us Directly</h2>
            <div className="flex flex-col items-center justify-center gap-3">
              <Phone className="w-6 h-6 text-gray-500" />
              <a href="tel:+77055381140" className="text-3xl font-mono text-indigo-400 hover:text-indigo-300 transition-colors">
                +7 705 538 1140
              </a>
              <p className="text-sm text-gray-500 mt-2">Available 24/7 for critical enterprise support.</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
