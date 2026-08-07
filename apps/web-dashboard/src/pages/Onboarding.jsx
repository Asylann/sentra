import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const { user, token, hasInstallation, refreshUser, logout, fetchWithAuth, apiBase } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('workspace');
  const [selected, setSelected] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (hasInstallation) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasInstallation, navigate]);

  // If user already completed onboarding but not install, skip to install step
  useEffect(() => {
    if (user?.onboarding_completed && !hasInstallation) {
      setStep('install');
    }
  }, [user, hasInstallation]);

  // Poll for installation when on install step
  useEffect(() => {
    if (step !== 'install' || !token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/users/me/installation`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.installed) {
            refreshUser();
          }
        }
      } catch {
        // silently ignore
      }
      setPollCount(c => c + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [step, token, apiBase, refreshUser]);

  const handleSubmitWorkspace = async () => {
    if (!selected) return;
    if (selected === 'company' && !orgName.trim()) return;

    setSubmitting(true);
    try {
      const body = { workspace_type: selected };
      if (selected === 'company') body.org_name = orgName.trim();

      const res = await fetchWithAuth('/api/v1/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStep('install');
      }
    } catch {
      // silently ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstallClick = () => {
    setChecking(true);
    window.open('https://github.com/apps/sentra-devex', '_blank');
    setTimeout(() => setChecking(false), 3000);
  };

  if (step === 'install') {
    return <InstallStep
      user={user}
      checking={checking}
      pollCount={pollCount}
      onInstall={handleInstallClick}
      onLogout={logout}
    />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative w-full max-w-2xl mx-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            {user?.avatar_url && (
              <motion.img
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                src={user.avatar_url}
                alt={user.login}
                className="size-16 rounded-full mx-auto mb-4 ring-2 ring-indigo-500/30"
              />
            )}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl font-semibold text-white mb-2"
            >
              How will you use Sentra?
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/50 text-base max-w-md mx-auto"
            >
              Choose how you'd like to set up your workspace.
            </motion.p>
          </div>

          {/* Selection Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          >
            {/* Personal Card */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected('personal')}
              className={`relative p-6 rounded-2xl border text-left transition-all duration-200 ${
                selected === 'personal'
                  ? 'bg-indigo-500/[0.08] border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
            >
              {selected === 'personal' && (
                <motion.div
                  layoutId="selection-glow"
                  className="absolute inset-0 rounded-2xl bg-indigo-500/[0.05]"
                  transition={{ type: 'spring', duration: 0.4 }}
                />
              )}
              <div className="relative">
                <div className={`size-12 rounded-xl flex items-center justify-center mb-4 ${
                  selected === 'personal'
                    ? 'bg-indigo-500/20 border border-indigo-500/30'
                    : 'bg-white/[0.05] border border-white/[0.08]'
                }`}>
                  <User className={`size-6 ${selected === 'personal' ? 'text-indigo-400' : 'text-zinc-400'}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Just for me</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Personal code analysis and quality tracking for your own repositories and contributions.
                </p>
              </div>
            </motion.button>

            {/* Company Card */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected('company')}
              className={`relative p-6 rounded-2xl border text-left transition-all duration-200 ${
                selected === 'company'
                  ? 'bg-indigo-500/[0.08] border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
            >
              {selected === 'company' && (
                <motion.div
                  layoutId="selection-glow"
                  className="absolute inset-0 rounded-2xl bg-indigo-500/[0.05]"
                  transition={{ type: 'spring', duration: 0.4 }}
                />
              )}
              <div className="relative">
                <div className={`size-12 rounded-xl flex items-center justify-center mb-4 ${
                  selected === 'company'
                    ? 'bg-indigo-500/20 border border-indigo-500/30'
                    : 'bg-white/[0.05] border border-white/[0.08]'
                }`}>
                  <Building2 className={`size-6 ${selected === 'company' ? 'text-indigo-400' : 'text-zinc-400'}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">With my team</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Collaborate with your engineering team. Shared dashboards, leaderboards, and org-wide policies.
                </p>
              </div>
            </motion.button>
          </motion.div>

          {/* Org Name Input (shown when company selected) */}
          <AnimatedOrgInput visible={selected === 'company'} value={orgName} onChange={setOrgName} />

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-6"
          >
            <button
              onClick={handleSubmitWorkspace}
              disabled={!selected || submitting || (selected === 'company' && !orgName.trim())}
              className="inline-flex items-center gap-2.5 px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all duration-150 active:scale-[0.97] shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </motion.div>

          {/* Sign out */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center mt-5"
          >
            <button
              onClick={logout}
              className="text-xs text-white/20 hover:text-white/40 transition-colors"
            >
              Sign out
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function AnimatedOrgInput({ visible, value, onChange }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Organization name
        </label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. Acme Corp"
          className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-all"
          autoFocus
        />
      </div>
    </motion.div>
  );
}

function InstallStep({ user, checking, pollCount, onInstall, onLogout }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-900/15 blur-[100px] rounded-full" />
      </div>

      <div className="relative w-full max-w-lg mx-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center"
          >
            {/* Animated ring */}
            <div className="relative size-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 rounded-full border border-indigo-500/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
                    fill="white" opacity="0.8" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">Install Sentra on GitHub</h2>
            <p className="text-sm text-white/40 mb-6 max-w-sm mx-auto">
              Choose which repositories to grant Sentra access to. You can change this any time from your GitHub settings.
            </p>

            <button
              onClick={onInstall}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all duration-150 active:scale-[0.97] shadow-lg shadow-indigo-600/20"
            >
              <ArrowRight className="size-4" />
              Install Sentra GitHub App
            </button>

            <div className="mt-6 flex items-center justify-center gap-2">
              {checking || pollCount > 0 ? (
                <>
                  <div className="size-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <p className="text-xs text-white/30">
                    {checking ? 'Waiting for installation...' : `Checking for installation... (${pollCount})`}
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/25">
                  After installing, this page will automatically detect it.
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center mt-5"
          >
            <button
              onClick={onLogout}
              className="text-xs text-white/20 hover:text-white/40 transition-colors"
            >
              Sign out
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
