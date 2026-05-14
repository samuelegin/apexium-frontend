import React from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ApplicantCard from './ApplicantCard';

function sortApplicants(apps) {
  return [...apps].sort((a, b) => {
    const scoreA = a.performance_snapshot?.avg_pi_score || 0;
    const scoreB = b.performance_snapshot?.avg_pi_score || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const rateA = a.performance_snapshot?.kpi_success_rate || 0;
    const rateB = b.performance_snapshot?.kpi_success_rate || 0;
    return rateB - rateA;
  });
}

export default function ApplicantsList({ applications, onSelect, selectPending }) {
  const sorted = sortApplicants(applications);

  if (applications.length === 0) {
    return (
      <Card className="border-border border-dashed">
        <CardContent className="p-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No applicants yet</p>
          <p className="text-xs text-muted-foreground mt-1">Share this job to attract qualified candidates.</p>
        </CardContent>
      </Card>
    );
  }

  const hasPerf = sorted.some(a => a.performance_snapshot?.avg_pi_score != null);

  return (
    <div className="space-y-3">
      {hasPerf && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          Sorted by performance score — highest quality applicants first
        </div>
      )}
      {sorted.map((app, idx) => (
        <ApplicantCard
          key={app.id}
          app={app}
          onSelect={onSelect}
          selectPending={selectPending}
        />
      ))}
    </div>
  );
}