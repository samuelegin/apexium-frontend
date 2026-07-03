import React, { useState } from 'react';
import { ChevronDown, ChevronUp, User, Users, Crown, Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

function PerformancePill({ label, value, accent }) {
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2 border ${
      accent
        ? 'bg-primary/10 border-primary/20'
        : 'bg-secondary/50 border-border'
    }`}>
      <span className={`text-sm font-bold font-mono ${accent ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

export default function ApplicantCard({ app, onSelect, selectPending }) {
  const [expanded, setExpanded] = useState(false);
  const perf = app.performance_snapshot || {};
  const hasPerf = perf.completed_jobs != null;
  const score = perf.avg_pi_score || 0;
  const isTopPerformer = hasPerf && score >= 80;

  return (
    <div className="rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors p-4">

      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          {app.is_pod
            ? <Users className="w-4 h-4 text-primary" />
            : <User className="w-4 h-4 text-muted-foreground" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {app.is_pod ? app.pod_name : `@${app.applicant_username}`}
            </span>
            {app.is_pod && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Pod
              </span>
            )}
            {isTopPerformer && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                <Star className="w-2.5 h-2.5" /> Top Performer
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
              app.status === 'accepted'
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary text-muted-foreground'
            }`}>
              {app.status}
            </span>
          </div>

          {app.created_date && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Applied {format(new Date(app.created_date), 'MMM d, yyyy · h:mm a')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {app.status === 'pending' && onSelect && (
            <button
              onClick={() => onSelect(app)}
              disabled={selectPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {selectPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Select
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Performance pills */}
      {hasPerf && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          <PerformancePill label="Completed" value={perf.completed_jobs ?? '—'} />
          <PerformancePill label="KPI Rate"  value={perf.kpi_success_rate != null ? `${perf.kpi_success_rate}%` : '—'} />
          <PerformancePill label="PI Score"  value={score > 0 ? score : '—'} accent={score >= 80} />
        </div>
      )}

      {/* Proposal preview */}
      <p className={`text-sm text-muted-foreground mt-3 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {app.proposal}
      </p>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">

          {/* Top categories */}
          {perf.top_categories?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Strength Areas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {perf.top_categories.map(cat => (
                  <span
                    key={cat}
                    className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground capitalize"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File attachment */}
          {app.file_url && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Attachment
              </p>
              <a
                href={app.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline underline-offset-2"
              >
                View attached file
              </a>
            </div>
          )}

          {/* Pod members */}
          {app.is_pod && app.pod_members?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Team Members & Reward Split
              </p>
              <div className="rounded-xl bg-secondary/40 border border-border p-3 space-y-1.5">
                {app.pod_members.map((m, i) => (
                  <div key={m.username} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Crown className="w-3 h-3 text-primary" />}
                      <span className="text-foreground">@{m.username}</span>
                      {i === 0 && <span className="text-xs text-muted-foreground">(Admin)</span>}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{m.share}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}