import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileCode, ShieldAlert, Code2, ArrowRight, GitPullRequest, ShieldCheck, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800">
      
      {/* Background Texture & Bouncing Logo */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 0%, #111 0%, transparent 60%)' }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Floating Icons */}
        <motion.div className="absolute top-[15%] left-[15%] text-indigo-500/10" animate={{ y: [0, 20, 0], rotate: [0, 10, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}><Code2 size={48} /></motion.div>
        <motion.div className="absolute bottom-[20%] left-[10%] text-rose-500/10" animate={{ y: [0, -25, 0], rotate: [0, -15, 15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}><GitPullRequest size={64} /></motion.div>
        <motion.div className="absolute top-[25%] right-[15%] text-emerald-500/10" animate={{ y: [0, 30, 0], rotate: [0, 20, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}><ShieldCheck size={56} /></motion.div>
        <motion.div className="absolute bottom-[25%] right-[20%] text-amber-500/10" animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}><Terminal size={40} /></motion.div>
        
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-indigo-500/20 blur-[2px]"
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
            animate={{
              y: [0, Math.random() * -100 - 50],
              x: [0, Math.random() * 40 - 20],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Bouncing Logo Animation */}
        <motion.div
          animate={{
            y: [-20, 20, -20],
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="opacity-10 absolute"
        >
          <img src="/logo_icon.png" alt="Sentra Icon" className="w-[30rem] h-[30rem] object-contain blur-sm grayscale" />
        </motion.div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center">
          <img src="/logo_with_name.png" alt="Sentra" className="h-16 md:h-20" />
        </div>
        
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <Link to="/agent" className="hover:text-white transition-colors">Agent</Link>
          <Link to="/enterprise" className="hover:text-white transition-colors">Enterprise</Link>
          <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign In</Link>
          <Link to="/login" className="text-sm font-medium text-white px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-colors border border-indigo-500/50">
            Sign Up
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        
        {/* Hero Section */}
        <section className="pt-24 pb-32 px-4 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 w-full relative">
             {/* The Big Animation (Moved from Dashboard) */}
             <div className="max-w-2xl relative group">
              <div className="rounded-xl border border-white/[0.08] bg-[#000] shadow-2xl overflow-hidden relative z-10 transition-colors duration-500 hover:border-white/20">
                <div className="flex items-center px-4 py-2.5 bg-[#0a0a0a] border-b border-white/[0.05]">
                  <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <div className="mx-auto flex items-center gap-2">
                    <FileCode className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-400 font-mono tracking-wider">api/auth.go</span>
                  </div>
                </div>
                <div className="p-6 md:p-8 font-mono text-sm leading-loose overflow-x-auto relative min-h-[300px]">
                  <div className="flex">
                    <div className="text-gray-700 select-none pr-4 text-right border-r border-white/5 mr-4 font-mono text-xs leading-loose pt-1">
                      12<br/>13<br/>14<br/>15<br/>16<br/>17<br/>18
                    </div>
                    <div className="w-full">
                      <div className="text-rose-400/90 line-through decoration-rose-500/50 bg-rose-500/[0.03] -mx-4 px-4 py-1 rounded-sm">- func ValidateToken(token string) bool {'{'}</div>
                      <div className="text-rose-400/90 line-through decoration-rose-500/50 bg-rose-500/[0.03] -mx-4 px-4 py-1 rounded-sm">-     return token == "super_secret_admin_key"</div>
                      <div className="text-rose-400/90 line-through decoration-rose-500/50 bg-rose-500/[0.03] -mx-4 px-4 py-1 rounded-sm">- {'}'}</div>
                      <div className="text-emerald-400/90 bg-emerald-500/[0.03] border-l border-emerald-500/50 -mx-4 px-4 py-1 mt-2">+ func ValidateToken(token string) (bool, error) {'{'}</div>
                      <div className="text-gray-500 bg-emerald-500/[0.03] border-l border-emerald-500/50 -mx-4 px-4 py-1">+     // Sentra AI: Migrated to secure HMAC verification</div>
                      <div className="text-emerald-400/90 bg-emerald-500/[0.03] border-l border-emerald-500/50 -mx-4 px-4 py-1">+     return auth.VerifyHMAC(token, config.Secret)</div>
                      <div className="text-emerald-400/90 bg-emerald-500/[0.03] border-l border-emerald-500/50 -mx-4 px-4 py-1">+ {'}'}</div>
                    </div>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
                    className="absolute top-8 right-4 md:right-8 w-64 md:w-80 bg-[#111] border border-white/10 rounded-lg p-4 shadow-xl"
                  >
                    <div className="flex gap-2 items-center mb-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span className="font-semibold text-rose-100 text-xs tracking-wide uppercase">Critical Vulnerability</span>
                    </div>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">Hardcoded secrets detected in source code. Violates <span className="text-rose-300 font-mono bg-white/5 px-1 py-0.5 rounded border border-white/5">CWE-798</span>.</p>
                  </motion.div>
    
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.6, ease: "easeOut" }}
                    className="absolute bottom-6 right-4 md:right-32 w-64 md:w-80 bg-[#111] border border-emerald-500/30 rounded-lg p-4 shadow-xl"
                  >
                    <div className="flex gap-2 items-center mb-2">
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-emerald-100 text-xs tracking-wide uppercase">AI Auto-Fix Suggested</span>
                    </div>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">Migrated to HMAC verification. Reconstructed global scope for <span className="text-emerald-300 font-mono bg-white/5 px-1 py-0.5 rounded border border-white/5">config.Secret</span>.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 mt-12 md:mt-0">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                Code reviews were hard before. Now, they feel <span className="text-[#8b5cf6]">impossible.</span>
              </motion.h1>
              <motion.p variants={itemVariants} className="text-lg text-gray-400 leading-relaxed mb-8 max-w-lg">
                Your team moves fast with AI. But fast shouldn't mean sloppy. We make sure every line still earns its merge.
              </motion.p>
              <motion.div variants={itemVariants}>
                <Link to="/login" className="inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-medium transition-colors border border-indigo-500/50 shadow-lg shadow-indigo-500/20">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-24 px-4 bg-[#050505] border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-16">
              <h2 className="text-4xl font-bold tracking-tight text-white">Faster reviews + better code.</h2>
              <Link to="/samples" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center gap-1 transition-colors">
                See a sample review <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="p-8 bg-[#0a0a0a] rounded-xl border border-white/[0.05] hover:border-white/10 transition-colors flex flex-col justify-end h-80 relative overflow-hidden group"
              >
                <div className="absolute top-8 left-8 right-8 h-32 border border-white/10 rounded-lg bg-gradient-to-br from-indigo-500/10 to-transparent flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                    <Code2 className="w-6 h-6 text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Catch fast. Fix fast.</h3>
                <p className="text-gray-400 text-sm">1-click commits for easy fixes and a "Fix with AI" button for harder ones.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="p-8 bg-[#0a0a0a] rounded-xl border border-white/[0.05] hover:border-white/10 transition-colors flex flex-col justify-end h-80 relative overflow-hidden group"
              >
                <div className="absolute top-8 left-8 right-8 h-32 border border-white/10 rounded-lg bg-gradient-to-br from-purple-500/10 to-transparent flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                   <div className="grid grid-cols-3 gap-2">
                     <div className="w-8 h-8 rounded bg-white/5 border border-white/10"></div>
                     <div className="w-8 h-8 rounded bg-purple-500/20 border border-purple-500/50"></div>
                     <div className="w-8 h-8 rounded bg-white/5 border border-white/10"></div>
                   </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">TL;DR for your diff.</h3>
                <p className="text-gray-400 text-sm">Quick context with a summary of changes, a walkthrough & an architectural diagram.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="p-8 bg-[#0a0a0a] rounded-xl border border-white/[0.05] hover:border-white/10 transition-colors flex flex-col justify-end h-80 relative overflow-hidden group"
              >
                <div className="absolute top-8 left-8 right-8 h-32 border border-white/10 rounded-lg bg-gradient-to-br from-rose-500/10 to-transparent flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full border border-rose-500/30 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Find the bugs. Skip the noise.</h3>
                <p className="text-gray-400 text-sm">We find bugs humans miss – & flag the time-consuming and tedious. Without the noise.</p>
              </motion.div>

            </div>
          </div>
        </section>

      </main>

      {/* Massive Footer Section */}
      <footer className="relative z-10 pt-24 pb-8 px-8 bg-[#000] border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 mb-24">
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-[#8b5cf6] text-xs font-bold uppercase tracking-widest mb-6">Products</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/agent" className="hover:text-white transition-colors">Agent</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#8b5cf6] text-xs font-bold uppercase tracking-widest mb-6">Navigation</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#8b5cf6] text-xs font-bold uppercase tracking-widest mb-6">Contact</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li>
                  <Link to="/support" className="hover:text-white transition-colors">Support</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="w-full md:w-80">
            <div className="flex gap-2">
              <input type="email" placeholder="youremail@domain.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
              <button className="bg-transparent border border-[#8b5cf6] text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Subscribe</button>
            </div>
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              By signing up you agree to our Terms of Use and authorize Sentra to provide occasional updates.
            </p>
          </div>
        </div>

        {/* Huge Outline Text */}
        <div className="w-full overflow-hidden flex justify-center pt-24 pb-4 select-none pointer-events-none relative -mb-6">
          <span 
            className="text-[26vw] leading-[0.75] font-bold text-transparent" 
            style={{ 
              WebkitTextStroke: '1px rgba(139, 92, 246, 0.4)', 
              letterSpacing: '-0.02em',
              transform: 'scaleX(1.05)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 95%)',
              maskImage: 'linear-gradient(to bottom, black 20%, transparent 95%)'
            }}>
            Sentra
          </span>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6 text-xs text-gray-500 pb-12 px-8">
          <Link to="/coming-soon" className="hover:text-gray-300 underline underline-offset-4 decoration-white/20">Terms of Service</Link>
          <Link to="/coming-soon" className="hover:text-gray-300 underline underline-offset-4 decoration-white/20">Privacy Policy</Link>
          <span className="ml-2">Sentra, Inc. © 2026</span>
        </div>
      </footer>

    </div>
  );
}
