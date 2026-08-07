import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';

// Pages
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Onboarding from './pages/Onboarding';

// Dashboard components
import DashboardView from './components/dashboard/DashboardView';
import PullRequestDetailView from './components/dashboard/PullRequestDetailView';
import PullRequestsView from './components/dashboard/PullRequestsView';
import RepositoriesView from './components/dashboard/RepositoriesView';
import SettingsView from './components/dashboard/SettingsView';
import LeaderboardView from './components/dashboard/LeaderboardView';
import Header from './components/layout/Header';
import LandingPage from './components/landing/LandingPage';
import SamplesPage from './components/landing/SamplesPage';
import ComingSoonPage from './components/landing/ComingSoonPage';
import FAQPage from './components/landing/FAQPage';
import AgentPage from './components/landing/AgentPage';
import AboutPage from './components/landing/AboutPage';
import SupportPage from './components/landing/SupportPage';
import EnterprisePage from './components/landing/EnterprisePage';
import PricingPage from './components/landing/PricingPage';
import BlogPage from './components/landing/BlogPage';

// Context
import { SentraWSProvider } from './context/SentraWSContext';

/**
 * ProtectedRoute — enforces authentication and onboarding state.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, hasInstallation, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="relative size-10">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasInstallation) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

/**
 * DashboardLayout — wraps dashboard routes with the authenticated header.
 */
function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, #161616 0%, transparent 60%)' }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <SentraWSProvider>
          <WorkspaceProvider>
            <Header />
            <main className="container mx-auto px-4 py-8 flex-1">
              <Outlet />
            </main>
          </WorkspaceProvider>
        </SentraWSProvider>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Auth required but no installation check */}
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />


          {/* Fully protected route (auth + installation) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardView />} />
            <Route path="prs" element={<PullRequestsView />} />
            <Route path="prs/:id" element={<PullRequestDetailView />} />
            <Route path="repositories" element={<RepositoriesView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="leaderboard" element={<LeaderboardView />} />
          </Route>

          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/samples" element={<SamplesPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/enterprise" element={<EnterprisePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/coming-soon" element={<ComingSoonPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="relative size-10">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
