import React from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, Target, Clock, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PIScoreGauge from '@/components/shared/PIScoreGauge';
import { KPI } from '@/api/entities';

function getPerformanceLevel(score) {
  if (score >= 71) return { label: 'High Performance', color: 'text-accent', bg: 'bg-accent/10 border-accent/30', icon: TrendingUp };
  if (score >= 41) return { label: 'Moderate Performance', color: 'text-chart-3', bg: 'bg-chart-3/10 border-chart-3/30', icon: Minus };
  return { label: 'Low Performance', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: TrendingDown };
}

function getInsight(kpis) {
  const sorted = [...kpis].sort((a, b) => b.weight - a.weight);
  const primary = sorted[0];
  if (!primary) return null;

  const totalScore = kpis.reduce((sum, k) => sum + ((k.completion_percent || 0) / 100) * k.weight, 0);
  const hasSubmitted = kpis.some(k => k.status === 'submitted');
  const hasApproved = kpis.some(k => k.status === 'approved');

  if (primary && (primary.status === 'not_started' || primary.status === 'in_progress') && (primary.completion_percent || 0) < 50) {
    return { icon: Flame, color: 'text-chart-3', text: 'Focus on your Primary KPI to improve your score fastest.' };
  }
  if (primary && primary.status === 'approved') {
    return { icon: CheckCircle2, color: 'text-accent', text: 'Great job completing your most impactful KPI.' };
  }
  if (hasSubmitted && !hasApproved) {
    return { icon: Send, color: 'text-primary', text: 'Proof submitted. Awaiting employer verification.' };
  }
  if (hasApproved) {
    return { icon: TrendingUp, color: 'text-accent', text: 'Your score has increased based on approved work.' };
  }
  if (totalScore >= 80) {
    return { icon: Target, color: 'text-accent', text: 'You are close to completion. Finish remaining KPIs to maximize your score.' };
  }
  if (totalScore < 40 && totalScore > 0) {
    return { icon: AlertTriangle, color: 'text-destructive', text: 'You are currently below optimal performance. Focus on completing remaining KPIs.' };
  }
  return { icon: Clock, color: 'text-muted-foreground', text: 'Start submitting proofs to begin building your score.' };
}

export default function PerformancePanel({ kpis, isEmployer = false, jobberUsername }) {
  const totalScore = kpis.reduce((sum, k) => sum + ((k.completion_percent || 0) / 100) * k.weight, 0);
  const roundedScore = Math.round(totalScore);
  const perf = getPerformanceLevel(roundedScore);
  const insight = getInsight(kpis);
  const InsightIcon = insight?.icon;
  const PerfIcon = perf.icon;

  const sorted = [...kpis].sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          {isEmployer && jobberUsername && (
            <p className="text-xs text-muted-foreground mb-3">
              @{jobberUsername}'s Performance
            </p>
          )}
          <div className="flex flex-col items-center gap-3">
            <PIScoreGauge score={roundedScore} size="lg" />
            <motion.div
              key={roundedScore}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${perf.bg} ${perf.color}`}
            >
              <PerfIcon className="w-3.5 h-3.5" />
              {perf.label}
            </motion.div>
          </div>

          {/* Live score formula */}
          <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Score Calculation</p>
            <div className="space-y-1.5">
              {sorted.map(k => {
                const contrib = ((k.completion_percent || 0) / 100) * k.weight;
                return (
                  <div key={k.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {k.is_primary && <Flame className="w-3 h-3 text-chart-3 shrink-0" />}
                      <span className="text-muted-foreground truncate">{k.name}</span>
                      <span className="text-muted-foreground/60 shrink-0">({k.weight}%)</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-muted-foreground">{k.completion_percent || 0}%</span>
                      <span className="text-muted-foreground/50">→</span>
                      <span className="font-mono font-medium text-foreground">{contrib.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between text-xs pt-1.5 mt-1 border-t border-border/50">
                <span className="font-medium text-foreground">Total Score</span>
                <span className="font-mono font-bold text-primary">{roundedScore}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insight Card */}
      {insight && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Performance Insight</p>
            <motion.div
              key={insight.text}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-start gap-2.5"
            >
              <InsightIcon className={`w-4 h-4 shrink-0 mt-0.5 ${insight.color}`} />
              <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
            </motion.div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}