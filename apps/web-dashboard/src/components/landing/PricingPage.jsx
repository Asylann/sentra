import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800 pb-24 relative overflow-hidden">
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

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-16 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6"
        >
          Simple, transparent pricing
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-16"
        >
          No hidden fees. No usage limits on standard tiers. Upgrade your code reviews today.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          {/* Pro Tier */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-8 bg-[#0a0a0a] rounded-2xl border border-white/5 relative overflow-hidden flex flex-col"
          >
            <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
            <p className="text-gray-400 text-sm mb-6">Perfect for small teams and startups.</p>
            <div className="mb-8">
              <span className="text-5xl font-bold text-white">$29</span>
              <span className="text-gray-500">/user/mo</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1">
              {['Unlimited AI code reviews', '1-click automated fixes', 'IDE Integrations (VS Code, JetBrains)', 'Standard support'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <button className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors">
              Start Free Trial
            </button>
          </motion.div>

          {/* Enterprise Tier */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-8 bg-gradient-to-b from-indigo-900/20 to-[#0a0a0a] rounded-2xl border border-indigo-500/30 relative overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.1)] flex flex-col"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
            <p className="text-indigo-200/60 text-sm mb-6">For large organizations requiring security & control.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-white">Custom</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1">
              {['Everything in Pro', 'VPC & On-Premise Deployments', 'Custom AI Fine-tuning', 'SSO / SAML Integration', 'Dedicated Success Manager'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link to="/enterprise" className="block text-center w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20">
              Contact Sales
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
