import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValueEvent } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileCode, ShieldAlert, Code2, ArrowRight, GitPullRequest, ShieldCheck, Terminal, Zap, Eye, Lock, Cpu, BarChart3, GitMerge, Building2, Users, CheckCircle2, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LanguageProvider } from '../../context/LanguageContext';

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

function B2BTeamSection({ t }) {
  const team = [
    { name: 'Alex', role: 'Backend', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', score: 94, branch: 'feat/auth-flow', status: 'merged' },
    { name: 'Sara', role: 'Full-stack', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', score: 87, branch: 'fix/api-timeout', status: 'reviewing' },
    { name: 'Kai', role: 'Infra', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face', score: 72, branch: 'refactor/db-pool', status: 'changes' },
  ];

  return (
    <section className="py-40 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#000]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left: Editorial copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-indigo-400 text-sm font-medium tracking-[0.15em] uppercase mb-6">{t('team.badge')}</p>
              <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-[-0.03em] text-white leading-[1.1] mb-8">
                {t('team.title')}{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{t('team.title.highlight')}</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-lg">
                {t('team.subtitle')}
              </p>

              {/* Live stats */}
              <div className="flex gap-10">
                {[
                  { value: '1,247', label: 'PRs reviewed' },
                  { value: '86', label: 'Avg score' },
                  { value: '342', label: 'Bugs caught' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  >
                    <div className="text-2xl font-bold text-white font-mono">{s.value}</div>
                    <div className="text-xs text-gray-600 mt-1 uppercase tracking-wider">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Floating team cards */}
          <div className="relative h-[480px]">
            {/* Connection lines (subtle) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 400 480">
              <motion.path
                d="M 200 80 Q 140 180 120 240 Q 100 300 200 400"
                stroke="url(#line-grad)" strokeWidth="1" fill="none" strokeDasharray="4 4"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                viewport={{ once: true }} transition={{ duration: 2, delay: 0.5 }}
              />
              <motion.path
                d="M 200 80 Q 260 180 280 240 Q 300 300 200 400"
                stroke="url(#line-grad)" strokeWidth="1" fill="none" strokeDasharray="4 4"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                viewport={{ once: true }} transition={{ duration: 2, delay: 0.7 }}
              />
              <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Sentra hub (center) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.3 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center backdrop-blur-sm shadow-2xl shadow-indigo-500/10">
                <img src="/logo_with_name.png" alt="Sentra" className="h-6 opacity-80" />
              </div>
              <motion.div
                className="absolute -inset-3 rounded-2xl border border-indigo-400/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>

            {/* Developer cards - positioned around the hub */}
            {team.map((dev, i) => {
              const positions = [
                { top: '4%', left: '25%', rotate: -2 },
                { top: '30%', right: '2%', rotate: 1 },
                { bottom: '8%', left: '15%', rotate: -1 },
              ];
              const pos = positions[i];
              const statusColors = {
                merged: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                reviewing: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
                changes: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
              };
              const statusLabels = { merged: 'Merged', reviewing: 'In Review', changes: 'Changes' };

              return (
                <motion.div
                  key={dev.name}
                  initial={{ opacity: 0, y: 30, rotate: 0 }}
                  whileInView={{ opacity: 1, y: 0, rotate: pos.rotate }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.2, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="absolute w-[240px]"
                  style={pos}
                >
                  <div className="bg-[#0A0A0F]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-2xl hover:border-white/[0.15] transition-all duration-500 hover:shadow-indigo-500/5">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={dev.avatar} alt={dev.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />
                      <div>
                        <div className="text-sm font-medium text-white">{dev.name}</div>
                        <div className="text-[11px] text-gray-500">{dev.role}</div>
                      </div>
                      <div className="ml-auto text-lg font-bold font-mono text-white/90">{dev.score}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GitMerge className="w-3 h-3 text-gray-600" />
                        <span className="text-[10px] font-mono text-gray-500">{dev.branch}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[dev.status]}`}>
                        {statusLabels[dev.status]}
                      </span>
                    </div>
                    {/* Score bar */}
                    <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${dev.score}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 + i * 0.2, duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${dev.score >= 85 ? 'bg-emerald-500' : dev.score >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function LeaderboardShowcase({ t }) {
  const devs = [
    { name: 'Alex K.', role: 'Backend Lead', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', score: 92, prs: 47, trend: '+4' },
    { name: 'Sara M.', role: 'Full-stack', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', score: 89, prs: 38, trend: '+7' },
    { name: 'Kai R.', role: 'Infra', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face', score: 78, prs: 52, trend: '-2' },
    { name: 'Jordan L.', role: 'Security', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face', score: 95, prs: 29, trend: '+1' },
    { name: 'Dev P.', role: 'Frontend', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face', score: 81, prs: 33, trend: '+3' },
  ];

  const weeklyData = [62, 71, 68, 79, 84, 88, 92];

  return (
    <section className="py-40 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#000]" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/[0.03] blur-[200px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left: The visualization */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative order-2 lg:order-1"
          >
            {/* Main leaderboard card */}
            <div className="bg-[#0A0A0F]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              {/* Top 3 podium */}
              <div className="p-6 pb-4 border-b border-white/[0.05]">
                <div className="flex items-end justify-center gap-3 h-[160px]">
                  {/* 2nd place */}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="flex flex-col items-center"
                  >
                    <img src={devs[1].avatar} alt={devs[1].name} className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-400/50 mb-2" />
                    <span className="text-[11px] text-gray-400 mb-2">{devs[1].name}</span>
                    <div className="w-16 bg-gradient-to-t from-zinc-700/30 to-zinc-600/20 rounded-t-lg flex items-end justify-center h-[70px] border border-white/[0.06] border-b-0">
                      <span className="text-lg font-bold text-zinc-300 mb-2">2</span>
                    </div>
                  </motion.div>
                  {/* 1st place */}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      <img src={devs[0].avatar} alt={devs[0].name} className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/60 mb-2" />
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="absolute -top-3 -right-1 text-amber-400 text-sm"
                      >
                        👑
                      </motion.div>
                    </div>
                    <span className="text-[11px] text-gray-300 font-medium mb-2">{devs[0].name}</span>
                    <div className="w-16 bg-gradient-to-t from-amber-600/20 to-amber-500/10 rounded-t-lg flex items-end justify-center h-[95px] border border-amber-500/20 border-b-0">
                      <span className="text-xl font-bold text-amber-400 mb-2">1</span>
                    </div>
                  </motion.div>
                  {/* 3rd place */}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    className="flex flex-col items-center"
                  >
                    <img src={devs[2].avatar} alt={devs[2].name} className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-400/40 mb-2" />
                    <span className="text-[11px] text-gray-400 mb-2">{devs[2].name}</span>
                    <div className="w-16 bg-gradient-to-t from-orange-700/20 to-orange-600/10 rounded-t-lg flex items-end justify-center h-[50px] border border-orange-500/15 border-b-0">
                      <span className="text-lg font-bold text-orange-400 mb-2">3</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Score list */}
              <div className="p-4 space-y-1">
                {devs.map((dev, i) => (
                  <motion.div
                    key={dev.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + i * 0.08, duration: 0.4 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-[11px] font-bold text-gray-600 w-5 text-center">{i + 1}</span>
                    <img src={dev.avatar} alt={dev.name} className="w-7 h-7 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-200 font-medium">{dev.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-mono ${dev.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {dev.trend}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${dev.score}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 1 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${dev.score >= 90 ? 'bg-emerald-500' : dev.score >= 80 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                        />
                      </div>
                      <span className="text-sm font-mono font-bold text-white w-7 text-right">{dev.score}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating mini chart card */}
            <motion.div
              initial={{ opacity: 0, y: 20, x: 20 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="absolute -bottom-6 -right-6 md:right-[-40px] bg-[#0A0A0F]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-2xl w-[180px]"
            >
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Team trend</div>
              <div className="flex items-end gap-[3px] h-[40px]">
                {weeklyData.map((val, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(val / 100) * 40}px` }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.4 + i * 0.05, duration: 0.4 }}
                    className="flex-1 rounded-sm bg-gradient-to-t from-purple-600/60 to-purple-400/40"
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] text-gray-600">Mon</span>
                <span className="text-[9px] text-gray-600">Sun</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Editorial copy */}
          <div className="order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-purple-400 text-sm font-medium tracking-[0.15em] uppercase mb-6">{t('leaderboard.badge')}</p>
              <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-[-0.03em] text-white leading-[1.1] mb-8">
                {t('leaderboard.title')}{' '}
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">{t('leaderboard.title.highlight')}</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-lg">
                {t('leaderboard.subtitle')}
              </p>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: '92', label: 'Top score this week', color: 'text-emerald-400' },
                  { value: '47', label: 'PRs merged (top dev)', color: 'text-indigo-400' },
                  { value: '+12%', label: 'Quality improvement', color: 'text-purple-400' },
                  { value: '5', label: 'Active contributors', color: 'text-amber-400' },
                ].map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <div className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{m.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingPageContent() {
  const { isAuthenticated } = useAuth();
  const { lang, switchLang, t } = useLanguage();

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
            <Link to="/agent" className="hover:text-white transition-colors duration-200">{t('nav.agent')}</Link>
            <Link to="/enterprise" className="hover:text-white transition-colors duration-200">{t('nav.enterprise')}</Link>
            <Link to="/pricing" className="hover:text-white transition-colors duration-200">{t('nav.pricing')}</Link>
            <Link to="/blog" className="hover:text-white transition-colors duration-200">{t('nav.blog')}</Link>
          </nav>
          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <button
              onClick={() => switchLang(lang === 'en' ? 'ru' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-sm text-gray-400 hover:text-white"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase">{lang}</span>
            </button>
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">{t('nav.signin')}</Link>
            <Link to="/login" className="text-sm font-medium text-white px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all duration-200 border border-indigo-500/50 hover:shadow-indigo-500/40 hover:scale-[1.02]">
              {t('nav.signup')}
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
                      <p className="text-xs text-gray-400 font-sans leading-relaxed mb-3">Migrated to HMAC verification with <span className="text-emerald-300 font-mono bg-white/5 px-1 py-0.5 rounded border border-white/5">config.Secret</span>.</p>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-md text-emerald-300 text-[11px] font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Apply suggestion
                      </motion.button>
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
                  {t('hero.title.line1')}{' '}
                  <span className="relative">
                    <span className="relative z-10 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                      {t('hero.title.line2')}
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
                  {t('hero.subtitle')}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 1.0 }}
                  className="flex items-center gap-4"
                >
                  <Link to="/login" className="group inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 px-7 py-3.5 rounded-xl font-medium transition-all duration-300 border border-indigo-500/50 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]">
                    {t('hero.cta')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link to="/samples" className="inline-flex items-center gap-2 text-gray-400 hover:text-white px-5 py-3.5 rounded-xl font-medium transition-all duration-300 border border-white/10 hover:border-white/20 hover:bg-white/[0.02]">
                    {t('hero.demo')}
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ===== B2B TEAM SECTION ===== */}
        <B2BTeamSection t={t} />

        {/* ===== LEADERBOARD METRICS ===== */}
        <LeaderboardShowcase t={t} />

        {/* ===== SCROLL TEXT REVEAL ===== */}
        <section className="py-40 px-4 relative">
          <GlowBeam />
          <div className="max-w-5xl mx-auto text-center">
            <ScrollRevealText
              text={t('scroll.text')}
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
                  {t('how.badge')}
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-16"
                >
                  {t('how.title.line1')}<br/>{t('how.title.line2')}
                </motion.h2>

                <div className="space-y-6">
                  {[
                    { icon: GitPullRequest, num: '01', title: t('how.step1.title'), desc: t('how.step1.desc') },
                    { icon: Cpu, num: '02', title: t('how.step2.title'), desc: t('how.step2.desc') },
                    { icon: ShieldCheck, num: '03', title: t('how.step3.title'), desc: t('how.step3.desc') },
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
              {t('stats.title')}
            </motion.h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
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
                {t('cta.title.line1')}{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {t('cta.title.line2')}
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
              {t('cta.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link to="/login" className="group inline-flex items-center gap-3 text-white bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-xl font-medium text-lg transition-all duration-300 border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]">
                {t('cta.button')}
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

export default function LandingPage() {
  return (
    <LanguageProvider>
      <LandingPageContent />
    </LanguageProvider>
  );
}
