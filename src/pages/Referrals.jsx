import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { generateReferralCode, getTier, getNextTier, REFERRAL_TIERS } from '@/lib/xp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, CheckCircle2, Zap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef } from 'react';
import XPBadge from '@/components/growth/XPBadge';
import { Referral } from '@/api/entities';

export default function Referrals() {
  const { user, refetch: refetchUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = user ? (user.referral_code || generateReferralCode(user.email)) : '';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const prevCountRef = useRef(0);
  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => Referral.filter({ referrer_email: user?.email }),
    enabled: !!user?.email,
    refetchInterval: 15000, // poll every 15s to catch new referrals in real-time
    onSuccess: (data) => {
      // If count increased since last check, silently refresh user so XP updates too
      if (data.length > prevCountRef.current) {
        prevCountRef.current = data.length;
        refetchUser();
      }
    },
  });

  const count = referrals.length;
  const currentTier = getTier(count);
  const nextTier = getNextTier(count);

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  const progressToNext = nextTier
    ? Math.round(((count - (currentTier?.min || 0)) / (nextTier.min - (currentTier?.min || 0))) * 100)
    : 100;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Invite others and earn XP for every signup.</p>
        </div>
        {user && <XPBadge xp={user.xp_total || 0} />}
      </div>

      {/* Referral link */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary border border-border px-3 py-2">
            <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{referralLink}</span>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 shrink-0" onClick={copyLink}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link. When someone signs up via your link, you earn <span className="text-accent font-semibold">+100 XP</span>.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-accent">{count * 100}</p>
            <p className="text-xs text-muted-foreground mt-1">XP Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Current tier */}
      {currentTier && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Badge className="bg-accent/20 text-accent border-0 text-xs mb-1">{currentTier.label}</Badge>
                <p className="text-sm text-foreground font-medium">Tier {currentTier.tier} Reached</p>
              </div>
              <Zap className="w-6 h-6 text-accent" />
            </div>
            {nextTier && (
              <>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{count} referrals</span>
                  <span>{nextTier.min} for {nextTier.label}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progressToNext}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {nextTier.min - count} more referrals to reach <span className="text-foreground font-medium">{nextTier.label}</span> (+{nextTier.xp} XP bonus)
                </p>
              </>
            )}
            {!nextTier && <p className="text-xs text-accent font-medium">Maximum tier reached! 🏆</p>}
          </CardContent>
        </Card>
      )}

      {/* Tiers breakdown */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Referral Tiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {REFERRAL_TIERS.map((tier, i) => {
            const reached = count >= tier.min;
            return (
              <div key={tier.tier} className={`flex items-center justify-between rounded-lg p-3 border ${reached ? 'border-accent/30 bg-accent/5' : 'border-border bg-secondary/20'}`}>
                <div className="flex items-center gap-3">
                  {reached
                    ? <CheckCircle2 className="w-4 h-4 text-accent" />
                    : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  }
                  <div>
                    <p className="text-sm font-medium text-foreground">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">{tier.min}{tier.max === Infinity ? '+' : `–${tier.max}`} referrals</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-accent font-semibold text-sm">
                  <Zap className="w-3.5 h-3.5" /> +{tier.xp} XP
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent referrals */}
      {referrals.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {referrals.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span className="text-muted-foreground">{r.referred_email}</span>
                <Badge className="bg-accent/20 text-accent border-0 text-xs">+100 XP</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}