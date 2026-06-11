/**
 * TelegramProfileConnect.jsx
 * Full-page redirect approach — no popup, no postMessage.
 * Click → go to backend widget → Telegram authorizes → backend saves username
 * → redirects back to /profile?telegram_connected=1
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import auth from '@/api/authApi';
import { toast } from 'sonner';
import { MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function TelegramProfileConnect({ telegramId, telegramUsername }) {
  const { refetch, user }               = useAuth();
  const [searchParams]                  = useSearchParams();
  const navigate                        = useNavigate();
  const [disconnecting, setDisconnecting] = useState(false);

  // When backend redirects back with ?telegram_connected=1, refetch and toast
  useEffect(() => {
    if (searchParams.get('telegram_connected') === '1') {
      refetch().then(() => {
        toast.success('Telegram connected!');
        navigate('/profile', { replace: true });
      }).catch(() => {
        toast.success('Telegram connected!');
        navigate('/profile', { replace: true });
      });
    }
  }, []);

  const handleConnect = () => {
    if (!user?.id) {
      toast.error('Not authenticated. Please refresh.');
      return;
    }
    const origin = window.location.origin;
    // Backend will save telegram data then redirect to /profile?telegram_connected=1
    window.location.href = `${API_BASE}/auth/telegram?origin=${encodeURIComponent(origin)}&callback_type=profile&user_id=${encodeURIComponent(user.id)}`;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await auth.disconnectTelegram();
      await refetch();
      toast.success('Telegram disconnected');
    } catch (err) {
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
              <Button size="sm" variant="outline" onClick={handleConnect} className="text-xs">
                Change
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={disconnecting} className="text-xs text-destructive">
                {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Disconnect'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Telegram account so projects can reach you.
            </p>
            <Button onClick={handleConnect} className="w-full bg-primary text-primary-foreground gap-2">
              <MessageCircle className="w-4 h-4" />
              Connect Telegram
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
