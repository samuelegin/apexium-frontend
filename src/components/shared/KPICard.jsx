import React from 'react';
import { Flame, Target, TrendingUp, CheckCircle2, Clock, Send, XCircle, Lock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const statusConfig = {
  not_started: { label: 'Not Started', color: 'bg-muted-foreground/20 text-muted-foreground', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-chart-3/20 text-chart-3', icon: TrendingUp },
  submitted:   { label: 'Submitted',   color: 'bg-primary/20 text-primary',                  icon: Send },
  approved:    { label: 'Approved',    color: 'bg-accent/20 text-accent',                    icon: CheckCircle2 },
  rejected:    { label: 'Rejected',    color: 'bg-destructive/20 text-destructive',           icon: XCircle },
};

export default function KPICard({ kpi, showStatus = false, compact = false, children }) {
  const status = statusConfig[kpi.status || 'not_started'];
  const StatusIcon = status.icon;
  const isApproved = kpi.status === 'approved';
  const completion = kpi.completion_percent || 0;
  const contribution = ((completion / 100) * kpi.weight).toFixed(1);
  const hasBaseline = !!kpi.baseline;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {kpi.is_primary && <Flame className="w-3.5 h-3.5 text-chart-3 shrink-0" />}
          <span className="text-sm font-medium truncate">{kpi.name}</span>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">{kpi.weight}%</Badge>
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-xl border p-4 md:p-5 transition-all ${
        kpi.is_primary
          ? 'border-chart-3/50 bg-chart-3/5 shadow-lg shadow-chart-3/10'
          : isApproved
          ? 'border-accent/40 bg-accent/5'
          : 'border-border bg-card'
      }`}
    >
      {kpi.is_primary && (
        <div className="absolute -top-3 left-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-chart-3 text-background text-xs font-semibold shadow-sm">
          <Flame className="w-3 h-3" /> Primary KPI
        </div>
      )}

      <div className="flex items-start justify-between mt-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground text-sm md:text-base">{kpi.name}</h4>
            {isApproved && <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />}
          </div>

          {/* Baseline → Current → Target display for growth KPIs */}
          {hasBaseline ? (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 border border-border/50">
                <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Base: <span className="font-medium text-foreground">{kpi.baseline}</span></span>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/20">
                <TrendingUp className="w-2.5 h-2.5 text-primary" />
                <span className="text-[11px] text-primary font-medium">Target: {kpi.target_value}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Target className="w-3.5 h-3.5" />
              <span>Target: <span className="text-foreground font-medium">{kpi.target_value}</span></span>
            </div>
          )}

          {/* Score contribution */}
          <p className="text-[11px] text-muted-foreground mt-2">
            Contributes <span className="font-medium text-foreground">{kpi.weight}%</span> to total score
            {showStatus && completion > 0 && (
              <> — currently <span className="text-primary font-medium">+{contribution}%</span></>
            )}
          </p>
        </div>

        <div className="text-right shrink-0 ml-3">
          <div className={`text-2xl font-bold font-mono ${kpi.is_primary ? 'text-chart-3' : 'text-foreground'}`}>
            {kpi.weight}%
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Weight</div>
        </div>
      </div>

      {showStatus && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge className={`${status.color} text-xs gap-1`}>
              <StatusIcon className="w-3 h-3" /> {status.label}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">{completion}%</span>
          </div>
          <div className="relative h-1.5 rounded-full overflow-hidden bg-secondary">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${
                isApproved ? 'bg-accent' : kpi.is_primary ? 'bg-chart-3' : 'bg-primary'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Score contribution</span>
            <span className="font-mono">{contribution}% / {kpi.weight}%</span>
          </div>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </motion.div>
  );
}