import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useMode } from '@/lib/ModeContext';
import {
  LayoutDashboard, Briefcase, Search, MessageSquare,
  Bell, User, Menu, X, Plus, Users, Shield, Moon, Sun, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Notification } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import ModeSwitcher from './ModeSwitcher';
import { motion, AnimatePresence } from 'framer-motion';
import DailyLoginReward from '@/components/growth/DailyLoginReward';
import WalletButton from '@/components/wallet/WalletButton';

/* ── Nav definitions ───────────────────────────────────────────────────────── */
const EMPLOYER_NAV = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/my-jobs',      icon: Briefcase,        label: 'My Jobs' },
  { path: '/chat',         icon: MessageSquare,    label: 'Messages' },
  { path: '/notifications',icon: Bell,             label: 'Alerts' },
  { path: '/profile',      icon: User,             label: 'Profile' },
];

const JOBBER_NAV = [
  { path: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/marketplace',   icon: Search,          label: 'Marketplace' },
  { path: '/my-jobs',       icon: Briefcase,       label: 'My Work' },
  { path: '/pods',          icon: Users,           label: 'Pods' },
  { path: '/chat',          icon: MessageSquare,   label: 'Messages' },
  { path: '/notifications', icon: Bell,            label: 'Alerts' },
  { path: '/profile',       icon: User,            label: 'Profile' },
];

/* ── Work3labs Logo ─────────────────────────────────────────────────────────── */
function Work3LabsLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="#111"/>
      {/* W mark — three descending pillars with rounded tops */}
      <path
        d="M18 24 L18 62 Q18 68 24 68 L28 68 Q34 68 34 62 L34 52 L42 52 L42 62 Q42 68 48 68 L52 68 Q58 68 58 62 L58 52 L66 52 L66 62 Q66 68 72 68 L76 68 Q82 68 82 62 L82 24 Q82 18 76 18 L72 18 Q66 18 66 24 L66 38 L58 38 L58 24 Q58 18 52 18 L48 18 Q42 18 42 24 L42 38 L34 38 L34 24 Q34 18 28 18 L24 18 Q18 18 18 24 Z"
        fill="#39FF6A"
      />
    </svg>
  );
}

/* ── Dark mode hook ─────────────────────────────────────────────────────────── */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('w3l_theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('w3l_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('w3l_theme', 'light');
    }
  }, [dark]);

  return [dark, setDark];
}

/* ── Main layout ────────────────────────────────────────────────────────────── */
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useDarkMode();
  const location = useLocation();
  const { user, refetch, logout } = useAuth();
  const { mode, isEmployer } = useMode();
  const navigate = useNavigate();
  const navItems = isEmployer ? EMPLOYER_NAV : JOBBER_NAV;

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0;
      const notifs = await Notification.filter({ user_email: user.email, is_read: false });
      return notifs.length;
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DailyLoginReward user={user} onXPAwarded={refetch} />

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card fixed h-full z-30">

        {/* Logo + brand */}
        <div className="px-5 pt-6 pb-5 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <Work3LabsLogo size={32} />
            <span className="text-[17px] font-semibold tracking-tight text-foreground">
              work3labs
            </span>
          </Link>
        </div>

        {/* Wallet — top of sidebar, prominent */}
        <div className="px-4 pt-4">
          <WalletButton />
        </div>

        {/* Mode switcher */}
        <div className="px-4 pt-3">
          <ModeSwitcher />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 pt-4 pb-2 overflow-y-auto space-y-0.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.16 }}
              className="space-y-0.5"
            >
              {navItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span>{item.label}</span>
                    {item.label === 'Alerts' && unreadCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </nav>

        {/* Admin link */}
        {user?.role === 'admin' && (
          <div className="px-4 pb-2">
            <Link
              to="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all border border-dashed border-border"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </Link>
          </div>
        )}

        {/* Bottom: CTA + dark mode toggle */}
        <div className="p-4 border-t border-border space-y-3">
          {isEmployer ? (
            <Link to="/post-job" className="block">
              <button className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />
                Post a Job
              </button>
            </Link>
          ) : (
            <Link to="/marketplace" className="block">
              <button className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Search className="w-4 h-4" />
                Find Work
              </button>
            </Link>
          )}

          <div className="flex items-center justify-between px-1">
            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {dark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <Work3LabsLogo size={26} />
            <span className="font-semibold text-[15px] text-foreground">work3labs</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Mode pill */}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isEmployer
                ? 'border-primary/30 bg-primary/8 text-primary'
                : 'border-primary/30 bg-primary/8 text-primary'
            }`}>
              {isEmployer ? 'EMPLOYER' : 'JOBBER'}
            </span>

            {/* Wallet compact */}
            <WalletButton compact />

            {/* Notifications */}
            <Link to="/notifications" className="relative p-1.5">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="lg:hidden fixed inset-0 z-30 bg-background pt-14 overflow-y-auto"
          >
            <div className="p-4 space-y-2">
              <ModeSwitcher />
              <div className="pt-1">
                <WalletButton />
              </div>
            </div>

            <nav className="px-4 space-y-0.5">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.label === 'Alerts' && unreadCount > 0 && (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                </Link>
              ))}

              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground border border-dashed border-border mt-2"
                >
                  <Shield className="w-5 h-5" />
                  <span>Admin Panel</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                </Link>
              )}
            </nav>

            <div className="p-4 mt-4 space-y-3">
              {isEmployer ? (
                <Link to="/post-job">
                  <button className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" /> Post a Job
                  </button>
                </Link>
              ) : (
                <Link to="/marketplace">
                  <button className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    <Search className="w-4 h-4" /> Find Work
                  </button>
                </Link>
              )}

              <div className="flex items-center justify-between px-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
                <button
                  onClick={() => setDark(d => !d)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  {dark ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-14">
          {navItems.slice(0, 5).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
