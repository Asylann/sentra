import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import NotificationBell from './NotificationBell';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function Header() {
  const { user, logout } = useAuth();
  const { isCompanyWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-black/60 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo + Workspace Switcher */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo_icon.png" alt="Sentra Logo" className="h-8 transition-transform group-hover:scale-105 duration-300" />
            <span className="text-xl font-semibold tracking-[0.25em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-white to-gray-400 ml-1 group-hover:from-white group-hover:via-white group-hover:to-white transition-all duration-300">
              Sentra
            </span>
          </Link>
          <div className="hidden sm:block h-6 w-px bg-white/[0.08]" />
          <div className="hidden sm:block">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link to="/dashboard/prs" className="hover:text-white transition-colors">Pull Requests</Link>
          <Link to="/dashboard/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
          <Link to="/dashboard/repositories" className="hover:text-white transition-colors">Repositories</Link>
          {isCompanyWorkspace && (
            <Link to="/dashboard/team" className="hover:text-white transition-colors flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-indigo-500" />
              Team
            </Link>
          )}
          <Link to="/dashboard/settings" className="hover:text-white transition-colors">Settings</Link>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-2 relative">
          <NotificationBell />

          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-white/40">{user.login}</span>
              </div>

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

              <AnimatePresence>
                {menuOpen && (
                  <>
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
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <p className="text-sm font-medium text-white">{user.name || user.login}</p>
                        <p className="text-xs text-white/30 mt-0.5">@{user.login}</p>
                      </div>
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
            <div className="size-8 rounded-full bg-white/5 animate-pulse" />
          )}
        </div>
      </div>
    </motion.header>
  );
}
