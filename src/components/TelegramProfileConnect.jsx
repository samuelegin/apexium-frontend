/**
 * TelegramProfileConnect.jsx — allows users to connect Telegram to their profile post-login
 * Handles the Telegram auth callback and saves telegram_id + telegram_username to user profile
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TELEGRAM_WIDGET_HOST = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function TelegramProfileConnect({ telegramId, telegramUsername }) {
  const { updateProfile, refetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [processingCallback, setProcessingCallback] = useState(false);

  // Handle Telegram callback (redirected from backend with telegram data in URL params)
  useEffect(() => {
    const id = searchParams.get('telegram_id');
    const username = searchParams.get('telegram_username');

    if (id && username && !processingCallback) {
      setProcessingCallback(true);
      (async () => {
        try {
          // Save telegram data to profile
          await updateProfile({
            telegram_id: String(id),
            telegram_username: String(username),
          });
          toast.success(`Telegram connected! (@${username})`);
          // Refetch to get updated user data
          await refetch();
          // Clear the URL params
          navigate('/profile', { replace: true });
        } catch (err) {
          console.error('[telegramConnect] error saving:', err);
          toast.error('Failed to save Telegram connection');
          navigate('/profile', { replace: true });
        } finally {
          setProcessingCallback(false);
        }
      })();
    }
  }, [searchParams, updateProfile, refetch, navigate, processingCallback]);

  const handleConnectClick = () => {
    setConnecting(true);
    // Send user to backend Telegram widget, passing current origin
    window.location.href = `${TELEGRAM_WIDGET_HOST}/auth/telegram?origin=${encodeURIComponent(window.location.origin)}&callback_type=profile`;
  };

  const isConnected = Boolean(telegramId && telegramUsername);

  if (processingCallback) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Connecting Telegram...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">
                Connected as <span className="font-semibold">@{telegramUsername}</span>
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleConnectClick}
              disabled={connecting}
              className="text-xs"
            >
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Change'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Telegram account so employers can reach you and see your Telegram username on job postings.
            </p>
            <Button
              onClick={handleConnectClick}
              disabled={connecting}
              className="w-full bg-primary text-primary-foreground gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  Connect Telegram
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
