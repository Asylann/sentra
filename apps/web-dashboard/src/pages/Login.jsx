import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { isAuthenticated, hasInstallation, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!loading && isAuthenticated) {
      navigate(hasInstallation ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [isAuthenticated, hasInstallation, loading, navigate]);

  const handleGitHubLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${baseUrl}/api/v1/auth/github/login`;
  };

  const urlError = new URLSearchParams(window.location.search).get('error');

  // Generate vertical bars for the animation
  const bars = Array.from({ length: 40 }).map((_, i) => {
    // Creating a wave-like pattern for the initial heights
    const baseHeight = 20 + Math.sin(i * 0.2) * 40 + Math.cos(i * 0.5) * 20;
    return Math.max(10, baseHeight); 
  });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#09090b] flex font-sans selection:bg-indigo-500/30">
      
      {/* Left Column: Animation & Value Prop */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#09090b] items-center justify-center border-r border-white/5">
        
        {/* Abstract Vertical Bars Animation Background */}
        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20 pointer-events-none">
          {bars.map((height, i) => (
            <motion.div
              key={i}
              className="w-2 md:w-3 lg:w-4 bg-white rounded-full"
              initial={{ height: height }}
              animate={{ 
                height: [height, height * 1.5 + Math.random() * 40, height],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.05
              }}
            />
          ))}
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 text-center max-w-xl px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4 leading-[1.1]">
              You're 2 clicks away from shipping higher-quality code.
            </h1>
            <p className="text-lg text-gray-400 font-mono mb-8">
              Free up development time while increasing productivity.
            </p>
            <div className="flex items-center justify-center gap-4">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300">14 days free trial</span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300">No credit card needed</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Column: Auth Panel */}
      <div className="w-full lg:w-[480px] xl:w-[540px] bg-[#000] flex flex-col justify-center relative">
        <div className="px-8 md:px-16 w-full max-w-md mx-auto">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="mb-10 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
                <img src="/logo_icon.png" alt="Sentra" className="h-8 w-8 object-contain" />
              </div>
              <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">
                Sign into Sentra
              </h2>
              <p className="text-sm text-gray-400">
                Welcome back, let's start reviewing.
              </p>
            </div>

            {urlError && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center lg:text-left">
                <p className="text-sm text-rose-400">
                  {urlError === 'missing_state' && 'Authentication failed — please try again.'}
                  {urlError === 'state_mismatch' && 'Security check failed — please try again.'}
                  {urlError === 'token_exchange_failed' && 'Could not connect to GitHub — please try again.'}
                  {urlError === 'user_fetch_failed' && 'Could not retrieve your GitHub profile.'}
                  {!['missing_state', 'state_mismatch', 'token_exchange_failed', 'user_fetch_failed'].includes(urlError) && `Error: ${urlError}`}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleGitHubLogin}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-[#0f0f0f] border border-white/10 rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all text-white font-medium text-sm group"
              >
                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub Cloud
                </div>
                <div className="text-gray-500 group-hover:text-white transition-colors">
                  &rarr;
                </div>
              </button>
            </div>

            <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10 text-xs font-medium text-gray-500 uppercase tracking-widest">
              or
            </div>

            <button className="mt-8 w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0f0f0f] border border-white/5 rounded-xl text-gray-400 cursor-not-allowed opacity-50 font-medium text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Single Sign-On
            </button>
            
            <p className="mt-6 text-center text-sm text-gray-500">
              New to Sentra? <a href="#" className="text-white hover:underline transition-all">Sign Up</a>
            </p>

          </motion.div>
        </div>
        
        {/* Footer Note */}
        <div className="absolute bottom-8 left-0 w-full px-8 md:px-16 text-center lg:text-left text-xs text-gray-600">
          By continuing, you agree to the <a href="#" className="text-indigo-400 hover:underline">Terms of Use</a> and <a href="#" className="text-indigo-400 hover:underline">Privacy Policy</a> applicable to Sentra.
        </div>
      </div>
      
    </div>
  );
}
