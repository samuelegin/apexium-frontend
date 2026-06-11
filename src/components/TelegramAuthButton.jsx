/**
 * TelegramAuthButton.jsx — login page Telegram button
 * Opens the Telegram widget in a popup, waits for postMessage, logs in.
 */
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function TelegramAuthButton({ label = 'Continue with Telegram' }) {
  const [loading, setLoading]   = useState(false);
  const { refetch }             = useAuth();
  const navigate                = useNavigate();

  const handleClick = () => {
    setLoading(true);

    const origin      = window.location.origin;
    const popupUrl    = `${API_BASE}/auth/telegram?origin=${encodeURIComponent(origin)}`;
    const popup       = window.open(popupUrl, 'tg_auth', 'width=480,height=560,left=200,top=100');

    if (!popup) {
      // Popup blocked — fall back to full-page redirect
      window.location.href = popupUrl;
      return;
    }

    const onMessage = (e) => {
      if (e.origin !== origin) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      window.removeEventListener('message', onMessage);
      setLoading(false);

      if (data.type === 'telegram_login' && data.token) {
        localStorage.setItem('apex_token', data.token);
        refetch().catch(() => {}).finally(() => navigate('/', { replace: true }));
      } else if (data.error) {
        console.error('[TelegramAuthButton] error:', data.error);
      }
    };

    window.addEventListener('message', onMessage);

    // Clean up if popup closed without messaging
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', onMessage);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      type="button"
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground disabled:opacity-60"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.5 13.5l8.5-6.5L6.5 17l-2.5-.9 5.5-1.6z" fill="#2AABEE"/>
        </svg>
      )}
      {loading ? 'Connecting...' : label}
    </button>
  );
}
