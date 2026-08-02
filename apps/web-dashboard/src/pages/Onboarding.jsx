import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Onboarding page — shown when a user is authenticated but hasn't installed
 * the Sentra GitHub App yet.
 *
 * Features:
 * - Step-by-step guide explaining what Sentra does
 * - CTA button linking to the GitHub App installation URL
 * - Auto-polls every 5s to detect when installation completes
 * - Smooth transition to dashboard once installed
 */
export default function Onboarding() {
  const { user, token, hasInstallation, refreshUser, logout, apiBase } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // If somehow they already have an installation, skip straight to dashboard
  useEffect(() => {
    if (hasInstallation) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasInstallation, navigate]);

  // Poll every 5 seconds to check if the user has installed the app
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/users/me/installation`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.installed) {
            // Refresh user in context (which updates hasInstallation) then navigate
            refreshUser();
          }
        }
      } catch {
        // Silently ignore poll errors
      }
      setPollCount((c) => c + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [token, apiBase, refreshUser]);

  const handleInstallClick = () => {
    setChecking(true);
    window.open('https://github.com/apps/sentra-devex', '_blank');
    // After they open the tab, start showing a "waiting" state
    setTimeout(() => setChecking(false), 3000);
  };

  const steps = [
    {
      icon: '🔒',
      title: 'Secure repository access',
      desc: 'Sentra reads your PR diffs to perform AI analysis. It never writes to your code.',
    },
    {
      icon: '🤖',
      title: 'AI-powered analysis',
      desc: 'Every Pull Request is analyzed by a state-of-the-art AI model for security, complexity, and architecture.',
    },
    {
      icon: '📊',
      title: 'Real-time dashboard',
      desc: 'Watch your PRs being analyzed live. Get DORA metrics, Quality Scores, and trend charts.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-900/15 blur-[100px] rounded-full" />
      </div>

      <div className="relative w-full max-w-2xl mx-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            {/* Avatar + welcome */}
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
              Welcome, <span className="text-indigo-400">{user?.login || 'there'}</span>!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/50 text-base max-w-md mx-auto"
            >
              One last step — install the Sentra GitHub App to allow AI analysis on your repositories.
            </motion.p>
          </div>

          {/* Steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5"
              >
                <span className="text-2xl mb-3 block">{step.icon}</span>
                <h3 className="text-sm font-medium text-white mb-1">{step.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Main card with CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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

            {/* Install button */}
            <button
              id="install-app-btn"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all duration-150 active:scale-[0.97] shadow-lg shadow-indigo-600/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2v10m0 0l-3-3m3 3l3-3M3 17l1.5 2.5a1 1 0 001.7 0L8 17H3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Install Sentra GitHub App
            </button>

            {/* Status indicator */}
            <div className="mt-6 flex items-center justify-center gap-2">
              {checking || pollCount > 0 ? (
                <>
                  <div className="size-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <p className="text-xs text-white/30">
                    {checking ? 'Waiting for installation…' : `Checking for installation… (${pollCount})`}
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/25">
                  After installing, this page will automatically detect it.
                </p>
              )}
            </div>
          </motion.div>

          {/* Sign out link */}
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
