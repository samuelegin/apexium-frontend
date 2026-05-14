import React, { useState, useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Zap, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import auth from '@/api/authApi';
import { Application, Job, KPI, Notification } from '@/api/entities';
import {
  checkCanApply,
  recordApplicationTimestamp,
  getCooldownRemaining,
  isQuickApplyEligible,
  getRelevanceWarning,
} from '@/lib/applicationGuards';

export default function QuickApplyButton({ user, job, jobId, onApplied }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const eligible = isQuickApplyEligible(user);
  const warning = getRelevanceWarning(job?.category, user?.top_categories || []);

  // Tick cooldown counter
  useEffect(() => {
    const remaining = getCooldownRemaining();
    if (!remaining) return;
    setCooldown(remaining);
    const interval = setInterval(() => {
      const r = getCooldownRemaining();
      setCooldown(r);
      if (!r) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleQuickApply() {
    setLoading(true);
    const { allowed, reason } = await checkCanApply(user.email);
    if (!allowed) {
      if (reason?.startsWith('cooldown:')) {
        const secs = reason.split(':')[1];
        toast.error(`Please wait ${secs}s before applying again.`);
      } else if (reason === 'daily_limit') {
        toast.error('Daily application limit reached. Try again tomorrow.');
      }
      setLoading(false);
      return;
    }

    // Collect performance data
    let completedJobsData = [];
    let kpis = [];
    try {
      completedJobsData = await Job.filter({
        selected_applicant_email: user.email,
        status: 'completed',
      });
      if (completedJobsData.length > 0) {
        const kpiResults = await Promise.all(
          completedJobsData.slice(0, 5).map(j => KPI.filter({ job_id: j.id }))
        );
        kpis = kpiResults.flat();
      }
    } catch (_) {}

    const completedCount = completedJobsData.length;
    const approvedKpis = kpis.filter(k => k.status === 'approved').length;
    const kpiSuccessRate = kpis.length > 0 ? Math.round((approvedKpis / kpis.length) * 100) : 0;
    const avgScore = user?.average_pi_score || 0;

    // Derive top categories from completed jobs
    const catCounts = {};
    completedJobsData.forEach(j => {
      if (j.category) catCounts[j.category] = (catCounts[j.category] || 0) + 1;
    });
    const topCategories = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);

    const performanceSnapshot = {
      completed_jobs: completedCount,
      kpi_success_rate: kpiSuccessRate,
      avg_pi_score: avgScore,
      top_categories: topCategories,
    };

    // AI-generate the proposal
    let proposal = '';
    try {
      proposal = await auth.generateProposal(`Generate a professional, concise job application for the position "${job.title}" (${job.category}, $${job.payment_amount}). Applicant has ${completedCount} completed jobs, ${kpiSuccessRate}% KPI success rate, ${avgScore} avg PI Score, strengths: ${topCategories.join(', ') || 'building experience'}. Write 3-4 sentences in first person.`);
    } catch (_) {
      proposal = `Hi, I'm ${user.full_name || user.username}. With ${completedCount} completed job${completedCount !== 1 ? 's' : ''} and a ${kpiSuccessRate}% KPI success rate, I'm confident I can deliver strong results for this role. I specialize in ${topCategories[0] || job.category} and have consistently met performance targets. I look forward to contributing to your project.`;
    }

    // Prevent duplicate applications from the same user
    const existingApps = await Application.filter({ job_id: jobId, applicant_email: user.email });
    if (existingApps.length > 0) {
      toast.error('You already applied to this job.');
      setLoading(false);
      return;
    }

    // Submit application
    try {
      await Application.create({
        job_id: jobId,
        applicant_email: user.email,
        applicant_username: user.username || user.full_name,
        proposal,
        status: 'pending',
        application_type: 'quick',
        is_pod: false,
        performance_snapshot: performanceSnapshot,
      });
      await Job.update(jobId, { applicant_count: (job.applicant_count || 0) + 1 });
      await Notification.create({
        user_email: job.employer_email,
        type: 'application_received',
        title: 'New Application',
        message: `@${user.username || user.full_name} applied to "${job.title}"`,
        job_id: jobId,
      });

      recordApplicationTimestamp();
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Quick Apply submitted!');
      onApplied?.();
    } catch (err) {
      toast.error('Submission failed. Please try again.');
    }

    setLoading(false);
  }

  if (!eligible) {
    return (
      <div className="rounded-lg border border-border bg-secondary/20 p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">Quick Apply not available</p>
          <p className="text-xs text-muted-foreground mt-0.5">Complete at least 1 job or reach a PI Score of 60+ to unlock Quick Apply.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {warning && (
        <div className="flex items-start gap-2 rounded-lg border border-chart-3/30 bg-chart-3/5 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-chart-3 mt-0.5 shrink-0" />
          <p className="text-xs text-chart-3">{warning}</p>
        </div>
      )}
      <Button
        onClick={handleQuickApply}
        disabled={loading || cooldown > 0}
        variant="outline"
        className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating application…</>
        ) : cooldown > 0 ? (
          <><Zap className="w-4 h-4" /> Wait {cooldown}s</>
        ) : (
          <><Zap className="w-4 h-4" /> Quick Apply</>
        )}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Auto-generates a professional application from your performance data. No input needed.
      </p>
    </div>
  );
}