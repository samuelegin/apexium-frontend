/**
 * TelegramProfileConnect.jsx
 * Embeds the Telegram widget directly in the React page (data-onauth mode).
 * No backend widget page, no redirect hell.
 * Flow: widget loads → user clicks → Telegram calls onTelegramAuth(user)
 *       → we POST to backend → backend saves → we refetch + toast
 */
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import auth from '@/api/authApi';

const API_BASE      = import.meta.env.VITE_API_BASE_URL ?? '/api';
const BOT_USERNAME  = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

export default function TelegramProfileConnect({ telegramId, telegramUsername }) {
  const { refetch, user }                 = useAuth();
  const widgetRef                         = useRef(null);
  const [saving, setSaving]               = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [widgetReady, setWidgetReady]     = useState(false);

  useEffect(() => {
    if (!BOT_USERNAME || !user?.id || telegramId) return;

    // Expose callback globally so Telegram widget can call it
    window.__onTelegramAuth = async (tgUser) => {
      setSaving(true);
      try {
        await fetch(`${API_BASE}/auth/telegram/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('apex_token')}`,
          },
          body: JSON.stringify({ ...tgUser, user_id: user.id }),
        }).then(r => {
          if (!r.ok) throw new Error('Failed to connect');
          return r.json();
        });
        await refetch();
        toast.success('Telegram connected!');
      } catch (err) {
        console.error('[TelegramConnect]', err);
        toast.error(err.message || 'Failed to connect Telegram');
      } finally {
        setSaving(false);
      }
    };

    // Inject Telegram widget script
    if (widgetRef.current && !widgetRef.current.hasChildNodes()) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', BOT_USERNAME);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', '__onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-userpic', 'false');
      script.async = true;
      script.onload = () => setWidgetReady(true);
      widgetRef.current.appendChild(script);
    }

    return () => { delete window.__onTelegramAuth; };
  }, [user?.id, telegramId]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await auth.disconnectTelegram();
      await refetch();
      toast.success('Telegram disconnected');
    } catch {
      toast.error('Failed to disconnect Telegram');
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = Boolean(telegramId || telegramUsername);

  return (
    <Card className={`border-border bg-card ${isConnected ? 'border-accent/30' : ''}`}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Telegram
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">
                Connected as <span className="font-semibold">@{telegramUsername}</span>
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={disconnecting} className="text-xs text-destructive">
              {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Disconnect'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Telegram account so projects can reach you.
            </p>
            {saving ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
              </div>
            ) : (
              <div ref={widgetRef} />
            )}
            {!BOT_USERNAME && (
              <p className="text-xs text-destructive">VITE_TELEGRAM_BOT_USERNAME not set</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
