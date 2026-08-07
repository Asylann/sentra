import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValueEvent } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileCode, ShieldAlert, Code2, ArrowRight, GitPullRequest, ShieldCheck, Terminal, Zap, Eye, Lock, Cpu, BarChart3, GitMerge, Building2, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function ParallaxLayer({ children, speed = 0.5, className = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, speed * 200]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });
  return (
    <motion.div ref={ref} style={{ y: smoothY }} className={className}>
      {children}
    </motion.div>
  );
}

function ScrollRevealText({ text, className = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.25"] });
  const words = text.split(' ');
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + (1 / words.length);
        return <ScrollWord key={i} word={word} range={[start, end]} progress={scrollYProgress} />;
      })}
    </p>
  );
}

function ScrollWord({ word, range, progress }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, [12, 0]);
  return (
    <motion.span style={{ opacity, y }} className="inline-block mr-[0.3em]">
      {word}
    </motion.span>
  );
}

function GlowBeam() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ['-100%', '200%']);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        style={{ x }}
        className="absolute top-0 w-[40%] h-full bg-gradient-to-r from-transparent via-indigo-500/[0.07] to-transparent skew-x-[-20deg]"
      />
    </div>
  );
}

function PerspectiveCard({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, rotateX: 12, scale: 0.92, y: 80 }}
      animate={isInView ? { opacity: 1, rotateX: 0, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ target, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame;
    const duration = 1500;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function B2BTeamSection() {
  return (
    <section className="py-32 px-4 relative overflow-hidden border-t border-white/[0.04] bg-[#020202]">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left: Text Content */}
        <div className="flex-1 text-center lg:text-left z-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-indigo-400 uppercase tracking-widest mb-4"
          >
            For Engineering Teams
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Build great software <br className="hidden lg:block"/>together.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10"
          >
            Invite your developers into a secure company workspace. Sentra AI reviews every pull request, tracks quality scores across your repositories, and surfaces team-wide insights — all in one centralized dashboard.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-[#020202] flex items-center justify-center bg-gradient-to-br ${
                  i === 1 ? 'from-purple-500 to-indigo-500' : 
                  i === 2 ? 'from-emerald-500 to-teal-500' :
                  i === 3 ? 'from-rose-500 to-orange-500' : 'from-blue-500 to-cyan-500'
                }`}>
                  <Users className="w-4 h-4 text-white/90" />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 font-medium">Built for teams of 5 to 5,000</p>
          </motion.div>
        </div>

        {/* Right: Animated Visual */}
        <div className="flex-1 w-full max-w-lg relative z-10 perspective-1000">
          <PerspectiveCard delay={0.2}>
            <div className="relative aspect-[4/3] bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 overflow-hidden flex items-center justify-center shadow-2xl shadow-indigo-500/5">
              
              {/* SVG Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.2))' }}>
                {[
                  { start: [20, 20], end: [50, 50] },
                  { start: [20, 80], end: [50, 50] },
                  { start: [80, 20], end: [50, 50] },
                  { start: [80, 80], end: [50, 50] }
                ].map((path, i) => (
                  <g key={i}>
                    {/* Base faint line */}
                    <path
                      d={`M ${path.start[0]}% ${path.start[1]}% L ${path.end[0]}% ${path.end[1]}%`}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="2"
                      fill="none"
                    />
                    {/* Animated moving pulse */}
                    <motion.circle
                      r="3"
                      fill="#818cf8"
                      initial={{ cx: `${path.start[0]}%`, cy: `${path.start[1]}%`, opacity: 0 }}
                      animate={{ 
                        cx: [`${path.start[0]}%`, `${path.end[0]}%`], 
                        cy: [`${path.start[1]}%`, `${path.end[1]}%`],
                        opacity: [0, 1, 1, 0] 
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        delay: i * 0.7,
                        ease: "easeInOut"
                      }}
                    />
                  </g>
                ))}
              </svg>

              {/* Developer Nodes */}
              {[
                { top: '20%', left: '20%' },
                { top: '80%', left: '20%' },
                { top: '20%', left: '80%' },
                { top: '80%', left: '80%' }
              ].map((pos, i) => (
                <motion.div 
                  key={i}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + (i * 0.1), type: "spring" }}
                  className="absolute w-12 h-12 -ml-6 -mt-6 bg-[#0a0a0a] border border-white/10 rounded-xl flex items-center justify-center z-10 shadow-lg"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <Code2 className="w-5 h-5 text-gray-400" />
                </motion.div>
              ))}

              {/* Center Workspace Node */}
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: "spring" }}
                className="relative z-20 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 backdrop-blur-md"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Building2 className="w-10 h-10 text-indigo-400" />
                </motion.div>
                
                {/* Ping rings */}
                <div className="absolute inset-0 rounded-2xl border border-indigo-400/30 animate-ping" style={{ animationDuration: '3s' }} />
              </motion.div>
              
              {/* Floating Success indicators */}
              <motion.div 
                animate={{ y: [-5, 5, -5] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[35%] right-[35%] bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1 flex items-center gap-1 backdrop-blur-md z-30"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-300 font-medium tracking-wide uppercase">Merged</span>
              </motion.div>
            </div>
          </PerspectiveCard>
        </div>
        
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0]);
  const heroScale = useTransform(heroScroll, [0, 0.7], [1, 0.96]);
  const heroY = useTransform(heroScroll, [0, 1], [0, 120]);

  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-indigo-900/50">

      {/* Grid background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.08), transparent)' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center">
            <img src="/logo_with_name.png" alt="Sentra" className="h-12 md:h-14" />
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            <Link to="/agent" className="hover:text-white transition-colors duration-200">Agent</Link>
            <Link to="/enterprise" className="hover:text-white transition-colors duration-200">Enterprise</Link>
            <Link to="/pricing" className="hover:text-white transition-colors duration-200">Pricing</Link>
            <Link to="/blog" className="hover:text-white transition-colors duration-200">Blog</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign In</Link>
            <Link to="/login" className="text-sm font-medium text-white px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all duration-200 border border-indigo-500/50 hover:shadow-indigo-500/40 hover:scale-[1.02]">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">

        {/* ===== HERO ===== */}
        <motion.section
          ref={heroRef}
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="min-h-screen flex items-center pt-24 pb-32 px-4 max-w-7xl mx-auto"
        >
          <div className="flex flex-col md:flex-row items-center gap-16 w-full">
            <ParallaxLayer speed={-0.15} className="flex-1 w-full relative">
              <div className="max-w-2xl relative group">
                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="rounded-xl border border-white/[0.08] bg-[#030303] shadow-2xl shadow-indigo-500/5 overflow-hidden relative z-10 transition-all duration-500 group-hover:border-white/15 group-hover:shadow-indigo-500/10">
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
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.6, delay: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="absolute top-8 right-4 md:right-8 w-64 md:w-72 bg-[#0c0c0c] border border-rose-500/20 rounded-lg p-4 shadow-2xl shadow-rose-500/5"
                    >
                      <div className="flex gap-2 items-center mb-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span className="font-semibold text-rose-100 text-xs tracking-wide uppercase">Critical Vulnerability</span>
                      </div>
                      <p className="text-xs text-gray-400 font-sans leading-relaxed">Hardcoded secrets detected. Violates <span className="text-rose-300 font-mono bg-white/5 px-1 py-0.5 rounded border border-white/5">CWE-798</span>.</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.6, delay: 1.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="absolute bottom-6 right-4 md:right-24 w-64 md:w-72 bg-[#0c0c0c] border border-emerald-500/20 rounded-lg p-4 shadow-2xl shadow-emerald-500/5"
                    >
                      <div className="flex gap-2 items-center mb-2">
                        <Code2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-emerald-100 text-xs tracking-wide uppercase">AI Auto-Fix</span>
                      </div>
                      <p className="text-xs text-gray-400 font-sans leading-relaxed">Migrated to HMAC verification with <span className="text-emerald-300 font-mono bg-white/5 px-1 py-0.5 rounded border border-white/5">config.Secret</span>.</p>
                    </motion.div>
                  </div>
                </div>
              </div>
            </ParallaxLayer>

            <div className="flex-1 mt-12 md:mt-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-white mb-6 leading-[1.05]"
                >
                  Code reviews were hard.{' '}
                  <span className="relative">
                    <span className="relative z-10 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                      Now they're not.
                    </span>
                    <motion.span
                      className="absolute -inset-x-2 -inset-y-1 bg-indigo-500/10 rounded-lg -z-0"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.8 }}
                  className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10 max-w-lg"
                >
                  Your team moves fast with AI. But fast shouldn't mean sloppy. Every line earns its merge.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 1.0 }}
                  className="flex items-center gap-4"
                >
                  <Link to="/login" className="group inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 px-7 py-3.5 rounded-xl font-medium transition-all duration-300 border border-indigo-500/50 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]">
                    Get Started
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link to="/samples" className="inline-flex items-center gap-2 text-gray-400 hover:text-white px-5 py-3.5 rounded-xl font-medium transition-all duration-300 border border-white/10 hover:border-white/20 hover:bg-white/[0.02]">
                    See Demo
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ===== SCROLL TEXT REVEAL ===== */}
        <section className="py-40 px-4 relative">
          <GlowBeam />
          <div className="max-w-5xl mx-auto text-center">
            <ScrollRevealText
              text="We built Sentra because AI-generated code still needs intelligent review. Not just linting — real architectural understanding, security analysis, and context-aware suggestions that make your team ship faster and safer."
              className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-[-0.02em] leading-[1.2] text-white"
            />
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-32 px-4 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
              {/* Left: Steps */}
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  className="text-sm font-medium text-indigo-400 uppercase tracking-widest mb-4"
                >
                  How it works
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-16"
                >
                  Three steps.<br/>Zero friction.
                </motion.h2>

                <div className="space-y-6">
                  {[
                    { icon: GitPullRequest, num: '01', title: 'Open a Pull Request', desc: 'Push code as you normally do. Sentra detects new PRs instantly via GitHub webhooks.' },
                    { icon: Cpu, num: '02', title: 'AI Analyzes the Diff', desc: 'Context-aware analysis: security vulnerabilities, architectural issues, performance concerns, and code quality.' },
                    { icon: ShieldCheck, num: '03', title: 'Review & Ship', desc: 'Inline comments appear on GitHub. One-click fixes for simple issues. Merge with confidence.' },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -60, filter: 'blur(8px)' }}
                      whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.7, delay: i * 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="flex items-start gap-6 p-6 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-indigo-500/20 transition-all duration-500 group"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:border-indigo-500/40 group-hover:shadow-lg group-hover:shadow-indigo-500/10 transition-all duration-500">
                          <step.icon className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-indigo-500/60">{step.num}</span>
                          <h4 className="text-lg font-semibold text-white">{step.title}</h4>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.5 + i * 0.2, type: "spring", stiffness: 200 }}
                        className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 self-center"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: Animated visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative hidden lg:flex items-center justify-center"
              >
                <div className="relative w-full aspect-square max-w-lg">
                  {/* Rotating rings */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border border-dashed border-indigo-500/20"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-12 rounded-full border border-dashed border-purple-500/15"
                  />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-20 rounded-full border border-dashed border-indigo-500/10"
                  />

                  {/* Pulsing glow */}
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-[30%] rounded-full bg-indigo-500/5 blur-2xl"
                  />

                  {/* Center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-2xl shadow-indigo-500/10"
                    >
                      <img src="/logo_icon.png" alt="" className="w-12 h-12 object-contain" />
                    </motion.div>
                  </div>

                  {/* Orbital nodes */}
                  {[
                    { icon: GitPullRequest, color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/10', angle: -30, radius: 42 },
                    { icon: Eye, color: 'text-indigo-400', border: 'border-indigo-500/40', bg: 'bg-indigo-500/10', angle: 90, radius: 42 },
                    { icon: ShieldCheck, color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', angle: 210, radius: 42 },
                  ].map((node, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.2, type: "spring", stiffness: 150 }}
                      className="absolute"
                      style={{
                        top: `${50 + node.radius * Math.sin((node.angle * Math.PI) / 180)}%`,
                        left: `${50 + node.radius * Math.cos((node.angle * Math.PI) / 180)}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 2.5 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                        className={`w-14 h-14 rounded-xl ${node.bg} border ${node.border} flex items-center justify-center shadow-lg backdrop-blur-sm`}
                      >
                        <node.icon className={`w-6 h-6 ${node.color}`} />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===== METRICS / STATS ===== */}
        <section className="py-32 px-4 relative border-t border-white/[0.04]">
          <GlowBeam />
          <div className="max-w-7xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="text-sm font-medium text-indigo-400 uppercase tracking-widest mb-4 text-center"
            >
              By the numbers
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-20 text-center"
            >
              Trusted at scale.
            </motion.h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
              {[
                { value: 10000, suffix: '+', label: 'PRs Reviewed Daily', icon: GitMerge },
                { value: 90, suffix: 's', prefix: '< ', label: 'Average Review Time', icon: Zap },
                { value: 94, suffix: '%', label: 'Accuracy Rate', icon: Eye },
                { value: 60, suffix: '%', label: 'Fewer Incidents', icon: Lock },
                { value: 3, suffix: '.2x', label: 'Faster Shipping', icon: BarChart3 },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="p-6 md:p-8 rounded-2xl border border-white/[0.06] bg-[#050505] hover:border-indigo-500/20 transition-all duration-500 group text-center"
                >
                  <stat.icon className="w-6 h-6 text-gray-700 group-hover:text-indigo-400 transition-colors duration-500 mx-auto mb-4" />
                  <div className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                    {stat.prefix || ''}<AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURE GRID ===== */}
        <section className="py-32 px-4 relative">
          <GlowBeam />
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-sm font-medium text-indigo-400 uppercase tracking-widest mb-4"
                >
                  Features
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl font-bold tracking-tight text-white"
                >
                  Faster reviews.<br/>Better code.
                </motion.h2>
              </div>
              <Link to="/samples" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 transition-colors">
                See a sample review <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PerspectiveCard delay={0} className="h-full">
                <div className="p-8 bg-[#050505] rounded-2xl border border-white/[0.06] hover:border-indigo-500/20 transition-all duration-500 flex flex-col justify-between h-80 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2">Catch fast. Fix fast.</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">1-click commits for easy fixes and a "Fix with AI" button for complex refactors. No context switching.</p>
                  </div>
                </div>
              </PerspectiveCard>

              <PerspectiveCard delay={0.15} className="h-full">
                <div className="p-8 bg-[#050505] rounded-2xl border border-white/[0.06] hover:border-purple-500/20 transition-all duration-500 flex flex-col justify-between h-80 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-purple-500/20 to-transparent" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2">TL;DR for your diff.</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Summary of changes, a walkthrough, and an architectural diagram. Understand any PR in 30 seconds.</p>
                  </div>
                </div>
              </PerspectiveCard>

              <PerspectiveCard delay={0.3} className="h-full">
                <div className="p-8 bg-[#050505] rounded-2xl border border-white/[0.06] hover:border-rose-500/20 transition-all duration-500 flex flex-col justify-between h-80 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-rose-500/20 to-transparent" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2">Find bugs. Skip noise.</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Real vulnerabilities. Real bugs. Zero false positives from formatting rules. Signal, not noise.</p>
                  </div>
                </div>
              </PerspectiveCard>
            </div>
          </div>
        </section>

        {/* ===== B2B TEAM SECTION ===== */}
        <B2BTeamSection />

        {/* ===== CTA ===== */}
        <section className="py-40 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent" />
          <div className="max-w-4xl mx-auto text-center relative">
            <ParallaxLayer speed={0.1}>
              <motion.h2
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-white mb-8 leading-[1.05]"
              >
                Stop shipping bugs.{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Start shipping confidence.
                </span>
              </motion.h2>
            </ParallaxLayer>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto"
            >
              Join engineering teams at startups and enterprises who trust Sentra to guard their codebase.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link to="/login" className="group inline-flex items-center gap-3 text-white bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-xl font-medium text-lg transition-all duration-300 border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </section>

      </main>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 pt-24 pb-8 px-8 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 mb-24">
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Products</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/agent" className="hover:text-white transition-colors">Agent</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Navigation</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Contact</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/support" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="w-full md:w-80">
            <div className="flex gap-2">
              <input type="email" placeholder="youremail@domain.com" className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all" />
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-indigo-500/50 whitespace-nowrap hover:scale-[1.02]">Subscribe</button>
            </div>
            <p className="text-xs text-gray-600 mt-4 leading-relaxed">
              By signing up you agree to our Terms of Use and authorize Sentra to provide occasional updates.
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          className="w-full overflow-hidden flex justify-center pt-16 pb-4 select-none pointer-events-none relative -mb-6"
        >
          <span
            className="text-[22vw] leading-[0.75] font-bold"
            style={{
              color: 'rgba(99, 102, 241, 0.13)',
              letterSpacing: '-0.04em',
              WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)',
              maskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)'
            }}>
            Sentra
          </span>
        </motion.div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6 text-xs text-gray-600 pb-12 px-8">
          <Link to="/coming-soon" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          <Link to="/coming-soon" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <span className="md:ml-auto">Sentra, Inc. &copy; 2026</span>
        </div>
      </footer>

    </div>
  );
}
