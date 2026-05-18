import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound  from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ModeProvider } from '@/lib/ModeContext';
import { ThemeProvider, useThemeMode } from '@/lib/ThemeContext';
import AppLayout     from '@/components/layout/AppLayout';
import Login         from '@/pages/Login';
import Dashboard     from '@/pages/Dashboard.jsx';
import Marketplace   from '@/pages/Marketplace';
import PostJob       from '@/pages/PostJob';
import JobDetail     from '@/pages/JobDetail';
import ActiveJob     from '@/pages/ActiveJob.jsx';
import MyJobs        from '@/pages/MyJobs';
import Chat          from '@/pages/Chat';
import Notifications from '@/pages/Notifications';
import Profile       from '@/pages/Profile';
import Tasks         from '@/pages/Tasks';
import Referrals     from '@/pages/Referrals';
import XPActivity    from '@/pages/XPActivity';
import AdminPanel    from '@/pages/AdminPanel';
import Pods          from '@/pages/Pods';
import AuthCallback  from '@/pages/AuthCallback';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';

/* ── Routes (inside all providers) ─────────────────────────────────────────── */
function AuthenticatedApp() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const modeConfirmed =
    user?.mode_confirmed === 1 ||
    user?.mode_confirmed === '1' ||
    user?.mode_confirmed === true;

  if (!isAuthenticated || (user && !modeConfirmed)) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*"              element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Admin — full-screen, outside AppLayout */}
      <Route path="/admin" element={<AdminPanel />} />

      {/* All other routes inside AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/"               element={<Dashboard />} />
        <Route path="/marketplace"    element={<Marketplace />} />
        <Route path="/post-job"       element={<PostJob />} />
        <Route path="/job/:id"        element={<JobDetail />} />
        <Route path="/active-job/:id" element={<ActiveJob />} />
        <Route path="/my-jobs"        element={<MyJobs />} />
        <Route path="/chat"           element={<Chat />} />
        <Route path="/notifications"  element={<Notifications />} />
        <Route path="/profile"        element={<Profile />} />
        <Route path="/tasks"          element={<Tasks />} />
        <Route path="/referrals"      element={<Referrals />} />
        <Route path="/xp-activity"    element={<XPActivity />} />
        <Route path="/pods"           element={<Pods />} />
        <Route path="*"              element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

/* ── RainbowKit theme tied to ThemeContext ──────────────────────────────────── */
function ThemedRainbowKit({ children }) {
  const { theme } = useThemeMode();
  const accent = 'hsl(138 100% 55%)'; // brand green

  return (
    <RainbowKitProvider
      theme={theme === 'dark'
        ? darkTheme({
            accentColor:           accent,
            accentColorForeground: '#0d0d0d',
            borderRadius:          'medium',
            fontStack:             'system',
          })
        : lightTheme({
            accentColor:           accent,
            accentColorForeground: '#0d0d0d',
            borderRadius:          'medium',
            fontStack:             'system',
          })
      }
    >
      {children}
    </RainbowKitProvider>
  );
}

/* ── Root ───────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    // ThemeProvider must be outermost so useThemeMode works everywhere
    <ThemeProvider>
      {/*
        CORRECT ORDER (wagmi docs requirement):
        WagmiProvider → RainbowKitProvider → everything else
        QueryClientProvider must be INSIDE WagmiProvider
      */}
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClientInstance}>
          <ThemedRainbowKit>
            <AuthProvider>
              <ModeProvider>
                <Router>
                  <AuthenticatedApp />
                </Router>
                <Toaster />
              </ModeProvider>
            </AuthProvider>
          </ThemedRainbowKit>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
