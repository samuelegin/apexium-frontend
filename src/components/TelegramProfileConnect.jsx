/**
 * TelegramProfileConnect.jsx — connect/disconnect Telegram on the profile page
 * Uses popup + postMessage pattern.
 */
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import auth from '@/api/authApi';
import { toast } from 'sonner';
import { MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function TelegramProfileConnect({ telegramId, telegramUsername }) {
  const { updateProfile, refetch, user } = useAuth();
  const [connecting,    setConnecting]   = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnectClick = () => {
    if (!user?.id) {
      toast.error('Not authenticated. Please refresh and try again.');
      return;
    }
    setConnecting(true);

    const origin   = window.location.origin;
    const popupUrl = `${API_BASE}/auth/telegram?origin=${encodeURIComponent(origin)}&callback_type=profile&user_id=${encodeURIComponent(user.id)}`;
    const popup    = window.open(popupUrl, 'tg_profile', 'width=480,height=560,left=200,top=100');

    if (!popup) {
      window.location.href = popupUrl;
      return;
    }

    const onMessage = async (e) => {
      if (e.origin !== origin) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      window.removeEventListener('message', onMessage);
      setConnecting(false);

      if (data.type === 'telegram_profile') {
        try {
          await updateProfile({
            telegram_id:       String(data.telegram_id),
            telegram_username: String(data.telegram_username),
          });
          await refetch();
          toast.success(`Telegram connected! (@${data.telegram_username})`);
        } catch (err) {
          console.error('[TelegramProfileConnect] save error:', err);
          toast.error('Failed to save Telegram connection');
        }
      } else if (data.error === 'already_linked') {
        toast.error('This Telegram account is already linked to another user.');
      } else if (data.error) {
        toast.error(`Telegram connection failed: ${data.error}`);
      }
    };

    window.addEventListener('message', onMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', onMessage);
        setConnecting(false);
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await auth.disconnectTelegram();
      await refetch();
      toast.success('Telegram disconnected');
    } catch (err) {
      console.error('[TelegramProfileConnect] disconnect error:', err);
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
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleConnectClick} disabled={connecting || disconnecting} className="text-xs">
                {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Change'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={disconnecting || connecting} className="text-xs text-destructive">
                {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Disconnect'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Telegram account so projects can reach you.
            </p>
            <Button onClick={handleConnectClick} disabled={connecting} className="w-full bg-primary text-primary-foreground gap-2">
              {connecting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Connecting...</>
              ) : (
                <><MessageCircle className="w-4 h-4" />Connect Telegram</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
