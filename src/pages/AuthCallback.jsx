/**
 * AuthCallback.jsx — handles the redirect from OAuth and Telegram connections
 * Routes: 
 *   - /auth/callback?token=xxx (login flow)
 *   - /auth/callback?telegram_id=xxx&telegram_username=xxx (profile connection flow)
 *
 * Google/Login → backend → redirects here with JWT in URL
 * Telegram profile → backend → redirects here with telegram data in URL
 * We store the token and redirect, or pass through for profile params
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { refetch }    = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const telegramId = searchParams.get('telegram_id');
    const telegramUsername = searchParams.get('telegram_username');

    if (error) {
      console.error('[auth-callback] Google auth failed:', error);
      navigate('/login?error=google_failed', { replace: true });
      return;
    }

    if (token) {
      // Login flow: save token and redirect
      localStorage.setItem('apex_token', token);
      refetch().then(() => navigate('/', { replace: true }));
      return;
    }

    const profileParams = new URLSearchParams();
    if (telegramId && telegramUsername) {
      profileParams.set('telegram_id', telegramId);
      profileParams.set('telegram_username', telegramUsername);
    }
    if (searchParams.get('discord_id') && searchParams.get('discord_username')) {
      profileParams.set('discord_id', searchParams.get('discord_id'));
      profileParams.set('discord_username', searchParams.get('discord_username'));
    }

    if (profileParams.toString()) {
      navigate(`/profile?${profileParams.toString()}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
