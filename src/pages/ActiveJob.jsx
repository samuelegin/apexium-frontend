import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MessageSquare, Flame, Upload, ExternalLink,
  Clock, CheckCircle2, XCircle, Send, AlertTriangle, Timer,
  ShieldCheck, ShieldAlert, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays, isPast } from 'date-fns';
import KPICard from '@/components/shared/KPICard.jsx';
import PerformancePanel from '@/components/activejob/PerformancePanel';
import ProofSubmitForm from '@/components/activejob/ProofSubmitForm';
import ProofReviewForm from '@/components/activejob/ProofReviewForm';
import DeadlineCountdown from '@/components/activejob/DeadlineCountdown';
import ActivityLog from '@/components/activejob/ActivityLog';
import { ExtensionRequestDialog, ExtensionReviewCard } from '@/components/activejob/ExtensionRequestForm';
import { Job, KPI, ProofSubmission } from '@/api/entities';

const proofStatusConfig = {
  pending:  { label: 'Pending Verification', color: 'bg-chart-3/20 text-chart-3',       icon: Shield },
  approved: { label: 'Verified',             color: 'bg-accent/20 text-accent',          icon: ShieldCheck },
  rejected: { label: 'Rejected',             color: 'bg-destructive/20 text-destructive', icon: ShieldAlert },
};

// Derive effective system state
function getSystemState(job, kpis, proofs) {
  if (job.status === 'completed') return { label: 'Completed', color: 'bg-accent/20 text-accent' };

  const deadline = job.deadline ? new Date(job.deadline + 'T23:59:59') : null;
  if (deadline && isPast(deadline)) return { label: 'Overdue', color: 'bg-destructive/20 text-destructive' };

  const hasSubmitted = proofs.length > 0;
  const daysSinceUpdate = job.last_activity_date
    ? differenceInDays(new Date(), new Date(job.last_activity_date))
    : differenceInDays(new Date(), new Date(job.updated_date || job.created_date));

  if (!hasSubmitted && daysSinceUpdate >= 3) return { label: 'At Risk', color: 'bg-destructive/10 text-destructive border-destructive/30' };

  const hasAnyProofPending = proofs.some(p => p.status === 'pending');
  if (hasAnyProofPending) return { label: 'Under Review', color: 'bg-primary/20 text-primary' };

  return { label: 'In Progress', color: 'bg-chart-3/20 text-chart-3' };
}

export default function ActiveJob() {
  const jobId = window.location.pathname.split('/').pop();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [proofKpi, setProofKpi] = useState(null);
  const [reviewProof, setReviewProof] = useState(null);
  const [reviewKpi, setReviewKpi] = useState(null);
  const [showExtension, setShowExtension] = useState(false);

  const { data: job, isLoading: loadingJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await Job.filter({ id: jobId });
      return jobs[0];
    },
  });

  const { data: kpis = [], isLoading: loadingKpis } = useQuery({
    queryKey: ['job-kpis', jobId],
    queryFn: () => KPI.filter({ job_id: jobId }),
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs', jobId],
    queryFn: () => ProofSubmission.filter({ job_id: jobId }),
    refetchInterval: 30000,
  });

  const isEmployer = job?.employer_email === user?.email;
  const isJobber = job?.selected_applicant_email === user?.email;

  // Sort by weight desc, then group by status for employer clarity
  const sortedKpis = [...kpis].sort((a, b) => b.weight - a.weight);
  const completedKpis = sortedKpis.filter(k => k.status === 'approved');
  const inProgressKpis = sortedKpis.filter(k => k.status === 'submitted' || k.status === 'in_progress');
  const notStartedKpis = sortedKpis.filter(k => k.status === 'not_started' || k.status === 'rejected');
  const groupedKpis = isEmployer
    ? [...completedKpis, ...inProgressKpis, ...notStartedKpis]
    : sortedKpis;

  const isOverdue = job?.deadline && isPast(new Date(job.deadline + 'T23:59:59'));

  if (loadingJob || loadingKpis) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!job) return <div className="text-center py-20 text-muted-foreground">Job not found</div>;

  const systemState = getSystemState(job, kpis, proofs);
  const getProofForKpi = (kpiId) => proofs.find(p => p.kpi_id === kpiId);

  return (
    <div className="pb-20 lg:pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground mb-2 -ml-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={systemState.color}>{systemState.label}</Badge>
            <DeadlineCountdown deadline={job.deadline} jobStatus={job.status} />
            <span className="text-xs text-muted-foreground">
              {isEmployer ? `Jobber: @${job.selected_applicant_username}` : `Employer: @${job.employer_username}`}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/chat?jobId=${jobId}`)} className="gap-2 shrink-0">
          <MessageSquare className="w-4 h-4" /> Chat
        </Button>
      </div>

      {/* Overdue banner */}
      {isOverdue && job.status !== 'completed' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/5">
          <XCircle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">This job has passed its deadline.</p>
            <p className="text-xs text-muted-foreground mt-0.5">New submissions are flagged. Coordinate with your employer to resolve.</p>
          </div>
        </div>
      )}

      {/* At-risk banner */}
      {systemState.label === 'At Risk' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">This job is at risk due to inactivity.</p>
        </div>
      )}

      {/* Extension review (employer) */}
      {isEmployer && job.extension_requested && (
        <ExtensionReviewCard job={job} />
      )}

      {/* Extension pending badge (jobber) */}
      {isJobber && job.extension_requested && job.extension_status === 'pending' && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-chart-3/30 bg-chart-3/5 text-xs text-chart-3">
          <Timer className="w-4 h-4" /> Extension request pending employer review.
        </div>
      )}
      {isJobber && job.extension_status === 'approved' && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-accent/30 bg-accent/5 text-xs text-accent">
          <CheckCircle2 className="w-4 h-4" /> Deadline extension approved.
        </div>
      )}
      {isJobber && job.extension_status === 'rejected' && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
          <XCircle className="w-4 h-4" /> Extension request was rejected.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* KPI Task Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-chart-3" /> KPI Task Board
            </h2>
            {/* Request extension button for jobber */}
            {isJobber && !isOverdue && !job.extension_requested && (
              <Button variant="outline" size="sm" onClick={() => setShowExtension(true)} className="gap-1.5 text-xs">
                <Timer className="w-3.5 h-3.5" /> Request Extension
              </Button>
            )}
          </div>

          {/* KPI group headers (employer only) */}
          {isEmployer && completedKpis.length > 0 && (
            <div className="text-xs uppercase tracking-wider text-accent flex items-center gap-2 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </div>
          )}

          <div className="space-y-3">
            {groupedKpis.map((kpi, idx) => {
              const proof = getProofForKpi(kpi.id);
              const isGroupBoundary = isEmployer && (
                (idx === completedKpis.length && inProgressKpis.length > 0) ||
                (idx === completedKpis.length + inProgressKpis.length && notStartedKpis.length > 0)
              );
              const groupLabel = idx === completedKpis.length
                ? (inProgressKpis.length > 0 ? '⏳ In Progress / Under Review' : null)
                : idx === completedKpis.length + inProgressKpis.length
                ? (notStartedKpis.length > 0 ? '— Not Started' : null)
                : null;

              return (
                <React.Fragment key={kpi.id}>
                  {isEmployer && isGroupBoundary && groupLabel && (
                    <div className="text-xs uppercase tracking-wider text-muted-foreground pt-2">{groupLabel}</div>
                  )}
                  <KPICard kpi={kpi} showStatus>
                    {proof ? (
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const cfg = proofStatusConfig[proof.status];
                              const Icon = cfg.icon;
                              return <Icon className={`w-3.5 h-3.5 ${proof.status === 'approved' ? 'text-accent' : proof.status === 'rejected' ? 'text-destructive' : 'text-chart-3'}`} />;
                            })()}
                            <span className="text-xs text-muted-foreground">{proofStatusConfig[proof.status].label}</span>
                          </div>
                          <Badge className={`text-xs ${proofStatusConfig[proof.status].color}`}>
                            {proof.status}
                          </Badge>
                        </div>
                        <a href={proof.proof_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" /> {proof.proof_link}
                        </a>
                        <p className="text-xs text-muted-foreground">Metric: {proof.metric_achieved}</p>
                        {proof.status === 'rejected' && proof.rejection_reason && (
                          <p className="text-xs text-destructive">Reason: {proof.rejection_reason}</p>
                        )}
                        {isEmployer && proof.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setReviewProof(proof); setReviewKpi(kpi); }}
                            className="w-full mt-2 gap-2"
                          >
                            Review Proof
                          </Button>
                        )}
                      </div>
                    ) : (
                      isJobber && kpi.status !== 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setProofKpi(kpi)}
                          className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Upload className="w-3.5 h-3.5" /> Submit Proof
                        </Button>
                      )
                    )}
                  </KPICard>
                </React.Fragment>
              );
            })}
          </div>

          {/* Activity Log */}
          <div className="mt-6">
            <ActivityLog proofs={proofs} kpis={kpis} job={job} />
          </div>
        </div>

        {/* Performance Panel */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Performance</h2>
          <PerformancePanel
            kpis={sortedKpis}
            isEmployer={isEmployer}
            jobberUsername={job?.selected_applicant_username}
          />
        </div>
      </div>

      {/* Modals */}
      {proofKpi && (
        <ProofSubmitForm
          kpi={proofKpi}
          jobId={jobId}
          existingProofs={proofs}
          open={!!proofKpi}
          onClose={() => setProofKpi(null)}
        />
      )}
      {reviewProof && reviewKpi && (
        <ProofReviewForm
          proof={reviewProof}
          kpi={reviewKpi}
          job={job}
          allKpis={kpis}
          open={!!reviewProof}
          onClose={() => { setReviewProof(null); setReviewKpi(null); }}
        />
      )}
      {showExtension && (
        <ExtensionRequestDialog
          job={job}
          open={showExtension}
          onClose={() => setShowExtension(false)}
        />
      )}
    </div>
  );
}