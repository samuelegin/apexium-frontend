import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound   from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ModeProvider } from '@/lib/ModeContext';
import { ThemeProvider, useThemeMode } from '@/lib/ThemeContext';
import AppLayout      from '@/components/layout/AppLayout';
import Login          from '@/pages/Login';
import Dashboard      from '@/pages/Dashboard.jsx';
import Marketplace    from '@/pages/Marketplace';
import PostJob        from '@/pages/PostJob';
import JobDetail      from '@/pages/JobDetail';
import ActiveJob      from '@/pages/ActiveJob.jsx';
import MyJobs         from '@/pages/MyJobs';
import Chat           from '@/pages/Chat';
import Notifications  from '@/pages/Notifications';
import Profile        from '@/pages/Profile';
import Tasks          from '@/pages/Tasks';
import Referrals      from '@/pages/Referrals';
import XPActivity     from '@/pages/XPActivity';
import AdminPanel     from '@/pages/AdminPanel';
import Pods           from '@/pages/Pods';
import AuthCallback from '@/pages/AuthCallback';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || (user && !(user.mode_confirmed === 1 || user.mode_confirmed === '1' || user.mode_confirmed === true))) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* ── Admin — completely outside AppLayout, its own full-screen layout ── */}
      <Route path="/admin" element={<AdminPanel />} />

      {/* ── All other routes inside AppLayout ─────────────────────────────── */}
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
        <Route path="*"               element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
function ThemeAwareRainbowKit({ children }) {
  const { theme } = useThemeMode();

  return (
    <RainbowKitProvider
      theme={theme === 'dark' ? darkTheme({
        accentColor:           'hsl(var(--primary))',
        accentColorForeground: 'hsl(var(--primary-foreground))',
        borderRadius:          'medium',
        fontStack:             'system',
      }) : lightTheme({
        accentColor:           'hsl(var(--primary))',
        accentColorForeground: 'hsl(var(--primary-foreground))',
        borderRadius:          'medium',
        fontStack:             'system',
      })}
    >
      {children}
    </RainbowKitProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemeAwareRainbowKit>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClientInstance}>
            <AuthProvider>
              <ModeProvider>
                <Router>
                  <AuthenticatedApp />
                </Router>
                <Toaster />
              </ModeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeAwareRainbowKit>
    </ThemeProvider>
  );
}
