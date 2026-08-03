import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

/**
 * Header — sticky top navigation for the authenticated dashboard.
 * Shows the Sentra logo, nav links, and the authenticated user's avatar + logout.
 */
export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-black/60 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src="/logo_with_name.png" alt="Sentra" className="h-10" />
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link to="/dashboard/prs" className="hover:text-white transition-colors">Pull Requests</Link>
          <Link to="/dashboard/repositories" className="hover:text-white transition-colors">Repositories</Link>
          <Link to="/dashboard/settings" className="hover:text-white transition-colors">Settings</Link>
        </div>

        {/* User section */}
        <div className="flex items-center gap-3 relative">
          {user ? (
            <>
              {/* User info */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-white/40">{user.login}</span>
              </div>

              {/* Avatar button */}
              <button
                id="user-menu-btn"
                onClick={() => setMenuOpen((o) => !o)}
                className="size-8 rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-indigo-500/50 transition-all"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.login} className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-indigo-900 flex items-center justify-center text-indigo-200 font-medium text-xs">
                    {user.login?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-10 right-0 z-20 w-52 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                      {/* User header */}
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <p className="text-sm font-medium text-white">{user.name || user.login}</p>
                        <p className="text-xs text-white/30 mt-0.5">@{user.login}</p>
                      </div>
                      {/* Menu items */}
                      <div className="py-1">
                        <a
                          href="https://github.com/apps/sentra-devex"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                          Manage Installation
                        </a>
                        <button
                          id="logout-btn"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/[0.05] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* Skeleton while loading */
            <div className="size-8 rounded-full bg-white/5 animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}
