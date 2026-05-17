/**
 * DiscordProfileConnect.jsx — allows users to connect Discord to their profile post-login
 * Handles the Discord OAuth2 callback and saves discord_id + discord_username to user profile
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Users, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DISCORD_WIDGET_HOST = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function DiscordProfileConnect({ discordId, discordUsername }) {
  const { updateProfile, refetch, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [processingCallback, setProcessingCallback] = useState(false);
  const [savedUsername, setSavedUsername] = useState(null);

  // Handle Discord callback (redirected from backend with Discord data in URL params)
  useEffect(() => {
    const id = searchParams.get('discord_id');
    const username = searchParams.get('discord_username');

    if (id && username && !processingCallback) {
      setProcessingCallback(true);
      (async () => {
        try {
          // Save Discord data to profile
          await updateProfile({
            discord_id: String(id),
            discord_username: String(username),
          });
          toast.success(`Discord connected! (@${username})`);
          // Store the saved username so it displays immediately
          setSavedUsername(username);
          // Refetch to get updated user data
          await refetch();
          // Clear the URL params
          navigate('/profile', { replace: true });
        } catch (err) {
          console.error('[discordConnect] error saving:', err);
          toast.error('Failed to save Discord connection');
          navigate('/profile', { replace: true });
        } finally {
          setProcessingCallback(false);
        }
      })();
    }
  }, [searchParams, updateProfile, refetch, navigate, processingCallback]);

  const handleConnectClick = () => {
    setConnecting(true);
    if (!user?.id) {
      toast.error('Not authenticated. Please refresh and try again.');
      setConnecting(false);
      return;
    }
    // Send user to backend Discord OAuth, passing current user ID so backend knows who to update
    window.location.href = `${DISCORD_WIDGET_HOST}/auth/discord?origin=${encodeURIComponent(window.location.origin)}&callback_type=profile&user_id=${encodeURIComponent(user.id)}`;
  };

  // Use savedUsername if just connected, otherwise use props
  const displayUsername = savedUsername || discordUsername;
  const isConnected = Boolean(discordId || displayUsername);

  if (processingCallback) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Connecting Discord...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border bg-card ${isConnected ? 'border-accent/30' : ''}`}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Discord
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">
                Connected as <span className="font-semibold">@{displayUsername}</span>
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
              Connect your Discord account so employers can reach you and see your Discord username on job postings.
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
                  <Users className="w-4 h-4" />
                  Connect Discord
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
