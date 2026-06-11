/**
 * AuthCallback.jsx — handles the redirect from OAuth and Telegram connections
 * Routes:
 *   - /auth/callback?token=xxx        (login flow — Telegram login, Google login)
 *   - /auth/callback?telegram_id=xxx  (profile connection flow)
 *   - /auth/callback?discord_id=xxx   (discord profile connection flow)
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { refetch }    = useAuth();

  useEffect(() => {
    const token          = searchParams.get('token');
    const error          = searchParams.get('error');
    const telegramId     = searchParams.get('telegram_id');
    const telegramUser   = searchParams.get('telegram_username');
    const discordId      = searchParams.get('discord_id');
    const discordUser    = searchParams.get('discord_username');

    if (error) {
      console.error('[auth-callback] auth failed:', error);
      navigate('/login?error=auth_failed', { replace: true });
      return;
    }

    if (token) {
      // Login flow — save token then navigate home
      localStorage.setItem('apex_token', token);
      refetch()
        .catch(() => {}) // never block navigation on refetch failure
        .finally(() => navigate('/', { replace: true }));
      return;
    }

    // Profile connection flow — pass params through to /profile
    const profileParams = new URLSearchParams();
    if (telegramId)  profileParams.set('telegram_id',       telegramId);
    if (telegramUser) profileParams.set('telegram_username', telegramUser);
    if (discordId)   profileParams.set('discord_id',        discordId);
    if (discordUser) profileParams.set('discord_username',  discordUser);

    if (profileParams.toString()) {
      navigate(`/profile?${profileParams.toString()}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
