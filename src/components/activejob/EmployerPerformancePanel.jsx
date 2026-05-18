import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import PIScoreGauge from '@/components/shared/PIScoreGauge';
import { KPI } from '@/api/entities';

function getState(score) {
  if (score >= 71) return { label: 'High Performance', color: 'text-accent', bg: 'bg-accent/10 border-accent/30' };
  if (score >= 41) return { label: 'Moderate Performance', color: 'text-chart-3', bg: 'bg-chart-3/10 border-chart-3/30' };
  return { label: 'Low Performance', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' };
}

export default function EmployerPerformancePanel({ kpis, jobberUsername }) {
  const piScore = kpis.reduce((sum, k) => sum + (k.weight / 100) * (k.completion_percent || 0), 0);
  const state = getState(piScore);
  const sortedKpis = [...kpis].sort((a, b) => b.weight - a.weight);
  const primaryKpi = sortedKpis[0];
  const primaryDone = primaryKpi && (primaryKpi.status === 'approved');
  const someIncomplete = kpis.some(k => k.status !== 'approved');

  const insight = primaryDone && !someIncomplete
    ? { text: 'Talent has completed all KPIs. Ready for final review.', icon: CheckCircle2, color: 'text-accent' }
    : primaryDone
    ? { text: `Talent is performing strongly on the primary KPI. Some tasks remain incomplete.`, icon: TrendingUp, color: 'text-chart-3' }
    : { text: `Primary KPI "${primaryKpi?.name}" is not yet complete. Talent needs to prioritize this.`, icon: AlertTriangle, color: 'text-chart-3' };

  const InsightIcon = insight.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {jobberUsername ? `@${jobberUsername}'s Performance` : 'Talent Performance'}
      </div>

      {/* Gauge */}
      <Card className="border-border bg-card">
        <CardContent className="p-6 flex flex-col items-center gap-3">
          <PIScoreGauge score={piScore} size="md" />
          <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${state.bg} ${state.color}`}>
            {state.label}
          </div>
        </CardContent>
      </Card>

      {/* KPI Contribution Breakdown */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> KPI Contribution
          </div>
          {sortedKpis.map(kpi => {
            const contribution = (kpi.weight / 100) * (kpi.completion_percent || 0);
            return (
              <div key={kpi.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1 mr-2">
                    {kpi.name} <span className="text-foreground/50">({kpi.weight}%)</span>
                  </span>
                  <span className="font-mono text-foreground shrink-0">+{contribution.toFixed(1)}%</span>
                </div>
                <Progress value={kpi.completion_percent || 0} className="h-1" />
              </div>
            );
          })}
          <div className="pt-2 border-t border-border flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Total Score</span>
            <span className="font-mono text-foreground">{piScore.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Insight */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <InsightIcon className={`w-4 h-4 shrink-0 mt-0.5 ${insight.color}`} />
          <p className={`text-sm ${insight.color}`}>{insight.text}</p>
        </CardContent>
      </Card>
    </div>
  );
}