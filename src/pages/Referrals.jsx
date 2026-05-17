import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { generateReferralCode, getTier, getNextTier, REFERRAL_TIERS } from '@/lib/xp';
import { Users, Copy, CheckCircle2, Zap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import XPBadge from '@/components/growth/XPBadge';
import { Referral } from '@/api/entities';

export default function Referrals() {
  const { user, refetch: refetchUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = user ? (user.referral_code || generateReferralCode(user.email)) : '';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const prevCountRef = useRef(0);
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => Referral.filter({ referrer_email: user?.email }),
    enabled: !!user?.email,
    refetchInterval: 15000,
    onSuccess: (data) => {
      if (data.length > prevCountRef.current) {
        prevCountRef.current = data.length;
        refetchUser();
      }
    },
  });

  const count        = referrals.length;
  const currentTier  = getTier(count);
  const nextTier     = getNextTier(count);
  const progressToNext = nextTier
    ? Math.round(((count - (currentTier?.min || 0)) / (nextTier.min - (currentTier?.min || 0))) * 100)
    : 100;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Referrals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Invite others and earn XP for every signup.</p>
        </div>
        {user && <XPBadge xp={user.xp_total || 0} />}
      </div>

      {/* Referral link */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Your referral link</h2>
        <div className="flex items-center gap-2 rounded-xl bg-secondary border border-border px-3 py-2.5">
          <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{referralLink}</span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-foreground hover:bg-card transition-colors shrink-0"
          >
            {copied
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Copied</>
              : <><Copy className="w-3.5 h-3.5" /> Copy</>
            }
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link. When someone signs up via your link, you earn{' '}
          <span className="text-primary font-semibold">+100 XP</span>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-3xl font-semibold font-mono text-foreground">{isLoading ? '—' : count}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-3xl font-semibold font-mono text-foreground">
            {isLoading ? '—' : count * 100}
          </p>
          <p className="text-xs text-muted-foreground mt-1">XP Earned</p>
        </div>
      </div>

      {/* Tier progress */}
      {currentTier && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Tier</p>
              <p className="text-base font-semibold text-foreground">{currentTier.label}</p>
            </div>
            <Zap className="w-5 h-5 text-primary" />
          </div>
          {nextTier && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{count} referrals</span>
                <span>{nextTier.min} for {nextTier.label}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* All tiers */}
      {REFERRAL_TIERS && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Tier rewards</h2>
          <div className="space-y-2">
            {REFERRAL_TIERS.map((tier, i) => {
              const isActive = currentTier?.label === tier.label;
              return (
                <div
                  key={tier.label}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    isActive ? 'bg-primary/8 border border-primary/20' : 'bg-secondary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    <div>
                      <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        {tier.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{tier.min}+ referrals</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    {tier.xpBonus ? `+${tier.xpBonus} XP bonus` : `${tier.xpPerReferral || 100} XP / referral`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referral list */}
      {referrals.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Your referrals</h2>
          <div className="space-y-2">
            {referrals.map(ref => (
              <div key={ref.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <span className="text-foreground">@{ref.referred_username || ref.referred_email}</span>
                <span className="text-xs text-primary font-semibold font-mono">+100 XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
