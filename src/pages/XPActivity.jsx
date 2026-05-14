import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, LogIn, CheckSquare, Users, Briefcase, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import XPBadge from '@/components/growth/XPBadge';
import { getLevel, getProgress, getNextThreshold } from '@/components/growth/XPBadge';
import { XPLog } from '@/api/entities';

const SOURCE_CONFIG = {
  daily_login:     { icon: LogIn,      color: 'text-primary',    label: 'Daily Login' },
  task_completed:  { icon: CheckSquare, color: 'text-accent',    label: 'Task Completed' },
  referral_signup: { icon: Users,       color: 'text-chart-4',   label: 'Referral' },
  referral_bonus:  { icon: Users,       color: 'text-chart-4',   label: 'Referral Bonus' },
  proof_submitted: { icon: FileCheck,   color: 'text-chart-3',   label: 'Proof Submitted' },
  job_completed:   { icon: Briefcase,   color: 'text-chart-5',   label: 'Job Completed' },
};

export default function XPActivity() {
  const { user } = useAuth();
  const xp = user?.xp_total || 0;
  const level = getLevel(xp);
  const progress = getProgress(xp);
  const nextThreshold = getNextThreshold(xp);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['xp-log', user?.email],
    queryFn: () => XPLog.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">XP Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your engagement history and XP earnings.</p>
      </div>

      {/* XP Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Rank</p>
              <XPBadge xp={xp} size="lg" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{xp.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
          </div>
          {nextThreshold && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{level.label}</span>
                <span>{xp} / {nextThreshold} XP</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{nextThreshold - xp} XP to next level</p>
            </div>
          )}
          {!nextThreshold && (
            <p className="text-xs text-accent font-medium">Maximum rank reached! 🏆</p>
          )}
        </CardContent>
      </Card>

      {/* Log */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />)}
            </div>
          )}
          {!isLoading && logs.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No XP earned yet. Complete tasks or log in daily!</p>
            </div>
          )}
          <div className="space-y-1">
            {logs.map(log => {
              const cfg = SOURCE_CONFIG[log.source] || SOURCE_CONFIG.task_completed;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{log.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy · h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-accent text-sm font-mono">+{log.xp_amount} XP</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}