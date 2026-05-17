import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Zap, LogIn, CheckSquare, Users, Briefcase, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import XPBadge from '@/components/growth/XPBadge';
import { getLevel, getProgress, getNextThreshold } from '@/components/growth/XPBadge';
import { XPLog } from '@/api/entities';

const SOURCE_CONFIG = {
  daily_login:     { icon: LogIn,       color: 'text-primary bg-primary/10',                          label: 'Daily Login' },
  task_completed:  { icon: CheckSquare, color: 'text-primary bg-primary/10',                          label: 'Task Completed' },
  referral_signup: { icon: Users,       color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/40', label: 'Referral' },
  referral_bonus:  { icon: Users,       color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/40', label: 'Referral Bonus' },
  proof_submitted: { icon: FileCheck,   color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40',    label: 'Proof Submitted' },
  job_completed:   { icon: Briefcase,   color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40',       label: 'Job Completed' },
};

export default function XPActivity() {
  const { user } = useAuth();
  const xp            = user?.xp_total || 0;
  const level         = getLevel(xp);
  const progress      = getProgress(xp);
  const nextThreshold = getNextThreshold(xp);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['xp-log', user?.email],
    queryFn: () => XPLog.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">XP Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your engagement history and XP earnings.</p>
      </div>

      {/* XP summary card */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your Rank</p>
            <XPBadge xp={xp} size="lg" />
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-foreground font-mono">{xp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
        </div>

        {nextThreshold ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{level?.label}</span>
              <span>{xp} / {nextThreshold} XP</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-primary font-medium">Max rank achieved! 🏆</p>
        )}
      </div>

      {/* Log */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">History</h2>

        {isLoading ? (
          <div className="space-y-2">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
              <Zap className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No XP earned yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const cfg  = SOURCE_CONFIG[log.source] || { icon: Zap, color: 'text-muted-foreground bg-secondary', label: log.source };
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                    {log.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary font-mono">+{log.xp_earned}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {log.created_date ? format(new Date(log.created_date), 'MMM d') : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
