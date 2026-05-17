import React from 'react';
import { Target, TrendingUp, CheckCircle2, Clock, Send, XCircle, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const statusConfig = {
  not_started: { label: 'Not Started', color: 'bg-secondary text-muted-foreground',                                    icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', icon: TrendingUp },
  submitted:   { label: 'Submitted',   color: 'bg-primary/10 text-primary',                                           icon: Send },
  approved:    { label: 'Approved',    color: 'bg-primary/10 text-primary',                                           icon: CheckCircle2 },
  rejected:    { label: 'Rejected',    color: 'bg-destructive/10 text-destructive',                                   icon: XCircle },
};

export default function KPICard({ kpi, showStatus = false, compact = false, children }) {
  const status     = statusConfig[kpi.status || 'not_started'];
  const StatusIcon = status.icon;
  const isApproved = kpi.status === 'approved';
  const completion = kpi.completion_percent || 0;
  const contribution = ((completion / 100) * kpi.weight).toFixed(1);
  const hasBaseline  = !!kpi.baseline;

  /* ── Compact mode ─────────────────────────────────────────────────────────── */
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {kpi.is_primary && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate">{kpi.name}</span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground shrink-0">
          {kpi.weight}%
        </span>
      </div>
    );
  }

  /* ── Full card ────────────────────────────────────────────────────────────── */
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-2xl border p-4 md:p-5 transition-all ${
        kpi.is_primary
          ? 'border-primary/30 bg-primary/5'
          : isApproved
          ? 'border-primary/20 bg-primary/3'
          : 'border-border bg-card'
      }`}
    >
      {/* Primary KPI badge */}
      {kpi.is_primary && (
        <div className="absolute -top-3 left-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70" /> Primary KPI
        </div>
      )}

      <div className="flex items-start justify-between mt-1">
        <div className="flex-1 min-w-0">

          {/* Name */}
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground text-sm md:text-base">{kpi.name}</h4>
            {isApproved && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
          </div>

          {/* Baseline → Target */}
          {hasBaseline ? (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary border border-border">
                <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Base: <span className="font-medium text-foreground">{kpi.baseline}</span>
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/20">
                <TrendingUp className="w-2.5 h-2.5 text-primary" />
                <span className="text-[11px] text-primary font-medium">Target: {kpi.target_value}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Target className="w-3.5 h-3.5" />
              <span>Target: <span className="font-medium text-foreground">{kpi.target_value}</span></span>
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

        {/* Weight number */}
        <div className="text-right shrink-0 ml-3">
          <div className={`text-2xl font-bold font-mono ${kpi.is_primary ? 'text-primary' : 'text-foreground'}`}>
            {kpi.weight}%
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Weight</div>
        </div>
      </div>

      {/* Status + progress bar */}
      {showStatus && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
              <StatusIcon className="w-3 h-3" /> {status.label}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{completion}%</span>
          </div>
          <div className="relative h-1.5 rounded-full overflow-hidden bg-secondary">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
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
