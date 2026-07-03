import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, XCircle, UserCheck, Activity, Timer } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function toDate(val) {
  if (!val) return null;
  try { return new Date(val); } catch { return null; }
}

function formatDate(val) {
  const d = toDate(val);
  if (!d || isNaN(d)) return '';
  return format(d, 'MMM d, yyyy · HH:mm');
}

function getEventConfig(type) {
  switch (type) {
    case 'job_accepted':   return { icon: UserCheck,    color: 'text-primary',     bg: 'bg-primary/10',     label: 'Job accepted — work has begun' };
    case 'proof_submitted':return { icon: Clock,        color: 'text-chart-3',     bg: 'bg-chart-3/10',     label: 'Proof submitted' };
    case 'proof_approved': return { icon: CheckCircle2, color: 'text-accent',      bg: 'bg-accent/10',      label: 'Proof approved' };
    case 'proof_rejected': return { icon: XCircle,      color: 'text-destructive', bg: 'bg-destructive/10', label: 'Proof rejected' };
    case 'extension': return { icon: Timer,        color: 'text-chart-3',     bg: 'bg-chart-3/10',     label: 'Deadline extension' };
    default: return { icon: Activity,     color: 'text-muted-foreground', bg: 'bg-secondary', label: 'Activity' };
  }
}

export default function ActivityLog({ proofs, kpis, job }) {
  const events = [];

  if (job) {
    events.push({ id: 'job-start', type: 'job_accepted', date: job.updated_date || job.created_date, detail: null });
  }

  if (job?.extension_status === 'approved') {
    events.push({ id: 'ext-approved', type: 'extension', date: job.updated_date, detail: `Deadline extended by ${job.extension_hours}h` });
  }

  proofs.forEach(proof => {
    const kpi = kpis.find(k => k.id === proof.kpi_id);
    const kpiName = kpi?.name || 'KPI';
    events.push({ id: `sub-${proof.id}`, type: 'proof_submitted', date: proof.created_date, detail: kpiName });
    if (proof.status === 'approved') {
      events.push({ id: `app-${proof.id}`, type: 'proof_approved', date: proof.updated_date, detail: kpiName });
    }
    if (proof.status === 'rejected') {
      events.push({ id: `rej-${proof.id}`, type: 'proof_rejected', date: proof.updated_date, detail: kpiName });
    }
  });

  events.sort((a, b) => {
    const da = toDate(a.date), db = toDate(b.date);
    if (!da || !db) return 0;
    return db - da;
  });

  if (events.length === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Activity Log
        </div>
        <div className="space-y-4">
          {events.map((event, i) => {
            const config = getEventConfig(event.type);
            const Icon = config.icon;
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${config.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {config.label}
                    {event.detail && <span className="text-muted-foreground"> — {event.detail}</span>}
                  </p>
                  {event.date && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(event.date)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}