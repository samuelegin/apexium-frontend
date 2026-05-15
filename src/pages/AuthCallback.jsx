/**
 * AuthCallback.jsx — handles the redirect from Google OAuth
 * Route: /auth/callback?token=xxx
 *
 * Google → backend → redirects here with JWT in URL
 * We store the token and redirect to home
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

    if (error) {
      console.error('[auth-callback] Google auth failed:', error);
      navigate('/login?error=google_failed', { replace: true });
      return;
    }

    if (token) {
      localStorage.setItem('apex_token', token);
      refetch().then(() => navigate('/', { replace: true }));
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
