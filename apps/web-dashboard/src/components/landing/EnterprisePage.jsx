import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldCheck, Zap } from 'lucide-react';

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800 pb-24 overflow-hidden relative">
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="inline-flex items-center justify-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-8 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
        >
          <Building2 className="w-12 h-12 text-amber-400" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
        >
          Sentra <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">Enterprise</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-16"
        >
          Scale your engineering velocity without compromising security. Sentra Enterprise delivers private VPC deployments, SSO integration, and custom AI fine-tuning.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, color: "emerald", title: "VPC & On-Prem", desc: "Deploy Sentra entirely within your own AWS, GCP, or Azure environment." },
            { icon: Zap, color: "amber", title: "Custom Fine-tuning", desc: "Train our models on your private codebase for hyper-personalized reviews." },
            { icon: Building2, color: "indigo", title: "SSO & SAML", desc: "Enterprise-grade identity management with Okta, Azure AD, and more." },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className="p-8 bg-[#0a0a0a] rounded-xl border border-white/5 text-left hover:border-white/10 transition-colors"
            >
              <feature.icon className={`w-8 h-8 mb-4 text-${feature.color}-400`} />
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
