import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useMode } from '@/lib/ModeContext';
import { useThemeMode } from '@/lib/ThemeContext';
import { LayoutDashboard, Briefcase, Search, MessageSquare, Bell, User, Menu, X, Plus, ChevronRight, Users, Shield, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notification } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import ModeSwitcher from './ModeSwitcher';
import { motion, AnimatePresence } from 'framer-motion';
import DailyLoginReward from '@/components/growth/DailyLoginReward';
import WalletButton from '@/components/wallet/WalletButton';

const EMPLOYER_NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/my-jobs', icon: Briefcase, label: 'My Jobs' },
  { path: '/chat', icon: MessageSquare, label: 'Messages' },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
  { path: '/profile', icon: User, label: 'Profile' },
];

function ThemeButton() {
  const { theme, toggleTheme } = useThemeMode();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-between w-full gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
    >
      <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

const JOBBER_NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/marketplace', icon: Search, label: 'Marketplace' },
  { path: '/my-jobs', icon: Briefcase, label: 'My Work' },
  { path: '/pods', icon: Users, label: 'Pods' },
  { path: '/chat', icon: MessageSquare, label: 'Messages' },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, refetch } = useAuth();
  const { theme, toggleTheme } = useThemeMode();
  const { mode, isEmployer } = useMode();
  const navItems = isEmployer ? EMPLOYER_NAV : JOBBER_NAV;

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

  return (
    <div className="min-h-screen bg-background flex">
      <DailyLoginReward user={user} onXPAwarded={refetch} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card fixed h-full z-30">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-background">
              <img src="/logo.jpg" alt="Work3Labs logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Work3Labs</span>
          </Link>
        </div>

        <div className="px-4 pt-4 pb-2 space-y-3">
          <ModeSwitcher />
          <ThemeButton />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              className="space-y-1"
            >
              {navItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.label === 'Alerts' && unreadCount > 0 && (
                      <Badge className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0">{unreadCount}</Badge>
                    )}
                  </Link>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </nav>

        {user?.role === 'admin' && (
          <div className="px-4 pb-1">
            <Link to="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-dashed border-border">
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </Link>
          </div>
        )}
        <div className="px-4 pb-3">
          <WalletButton />
        </div>
        <div className="p-4 border-t border-border">
          {isEmployer ? (
            <Link to="/post-job">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="w-4 h-4" /> Post Job
              </Button>
            </Link>
          ) : (
            <Link to="/marketplace">
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                <Search className="w-4 h-4" /> Find Work
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-background">
              <img src="/logo.jpg" alt="Work3Labs logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-foreground">Work3Labs</span>
          </Link>

          <div className="flex items-center gap-1">
            {/* Mode pill */}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isEmployer ? 'border-primary/40 bg-primary/10 text-primary' : 'border-accent/40 bg-accent/10 text-accent'
            }`}>
              {isEmployer ? 'PROJECT' : 'TALENT'}
            </span>

            {/* Theme toggle — icon only, no text */}
            <button
              type="button"
              onClick={() => toggleTheme()}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-10 h-10 flex items-center justify-center rounded-xl touch-manipulation hover:bg-muted/60 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Hamburger — larger tap target, bigger icon */}
            <button
              type="button"
              aria-label="Toggle mobile menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-11 h-11 flex items-center justify-center rounded-xl touch-manipulation hover:bg-muted/60 transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="lg:hidden fixed inset-0 z-30 bg-background/95 backdrop-blur-md pt-14"
          >
            <div className="p-4 space-y-3">
              <ModeSwitcher />
              <ThemeButton />
            </div>
            <nav className="px-4 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                    location.pathname === item.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                </Link>
              ))}
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground border border-dashed border-border mt-2">
                  <Shield className="w-5 h-5" />
                  <span>Admin Panel</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                </Link>
              )}
              <div className="pt-4 space-y-3">
                {isEmployer ? (
                  <Link to="/post-job" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> Post Job</Button>
                  </Link>
                ) : (
                  <Link to="/marketplace" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-accent text-accent-foreground gap-2"><Search className="w-4 h-4" /> Find Work</Button>
                  </Link>
                )}
                <WalletButton />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-14">
          {navItems.slice(0, 5).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}
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