import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

/**
 * AuthCallback page — handles the OAuth redirect from our Go API Gateway.
 *
 * The gateway redirects here with: /auth/callback?token=<jwt>
 * This page:
 *  1. Extracts the JWT from the query params
 *  2. Saves it to AuthContext (which persists to localStorage)
 *  3. Redirects to /dashboard or /onboarding based on installation status
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { saveToken, user, hasInstallation, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate(`/login?error=${error}`, { replace: true });
      return;
    }

    if (!token) {
      navigate('/login?error=no_token', { replace: true });
      return;
    }

    // Save the JWT — this triggers AuthContext to fetch the user profile
    saveToken(token);
  }, [searchParams, saveToken, navigate]);

  // Once user is loaded, redirect to appropriate page
  useEffect(() => {
    if (!loading) {
      if (user) {
        // Small delay for the animation to feel intentional
        setTimeout(() => {
          navigate(hasInstallation ? '/dashboard' : '/onboarding', { replace: true });
        }, 800);
      } else {
        // Failed to fetch user profile (e.g., token invalid or proxy error)
        navigate('/login?error=user_fetch_failed', { replace: true });
      }
    }
  }, [user, loading, hasInstallation, navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5"
      >
        {/* Spinning loader */}
        <div className="relative size-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 animate-spin" />
        </div>

        <div className="text-center">
          <p className="text-white/80 font-medium">Authenticating with GitHub…</p>
          <p className="text-white/30 text-sm mt-1">Setting up your workspace</p>
        </div>
      </motion.div>
    </div>
  );
}
