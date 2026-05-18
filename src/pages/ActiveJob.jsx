import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, MessageSquare, Upload, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Timer,
  ShieldCheck, ShieldAlert, Shield,
} from 'lucide-react';
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

/* ── Proof status config ────────────────────────────────────────────────────── */
const proofStatusConfig = {
  pending:  { label: 'Pending Verification', icon: Shield },
  approved: { label: 'Verified',             icon: ShieldCheck },
  rejected: { label: 'Rejected',             icon: ShieldAlert },
};

const proofStatusColors = {
  pending:  'text-amber-600',
  approved: 'text-primary',
  rejected: 'text-destructive',
};

/* ── System state ───────────────────────────────────────────────────────────── */
function getSystemState(job, kpis, proofs) {
  if (job.status === 'completed') return { label: 'Completed', style: 'bg-primary/10 text-primary' };
  const deadline = job.deadline ? new Date(job.deadline + 'T23:59:59') : null;
  if (deadline && isPast(deadline)) return { label: 'Overdue', style: 'bg-destructive/10 text-destructive' };
  const hasSubmitted = proofs.length > 0;
  const daysSinceUpdate = job.last_activity_date
    ? differenceInDays(new Date(), new Date(job.last_activity_date))
    : differenceInDays(new Date(), new Date(job.updated_date || job.created_date));
  if (!hasSubmitted && daysSinceUpdate >= 3) return { label: 'At Risk', style: 'bg-destructive/10 text-destructive' };
  const hasAnyProofPending = proofs.some(p => p.status === 'pending');
  if (hasAnyProofPending) return { label: 'Under Review', style: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' };
  return { label: 'In Progress', style: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' };
}

/* ── Banner ─────────────────────────────────────────────────────────────────── */
function Banner({ icon: Icon, message, variant = 'warn' }) {
  const styles = {
    warn:    'border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
    danger:  'border-destructive/30 bg-destructive/5 text-destructive',
    success: 'border-primary/20 bg-primary/5 text-primary',
  };
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${styles[variant]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function ActiveJob() {
  const jobId = window.location.pathname.split('/').pop();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [proofKpi,     setProofKpi]     = useState(null);
  const [reviewProof,  setReviewProof]  = useState(null);
  const [reviewKpi,    setReviewKpi]    = useState(null);
  const [showExtension, setShowExtension] = useState(false);

  /* ── Queries ─────────────────────────────────────────────────────────────── */
  const { data: job, isLoading: loadingJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => { const jobs = await Job.filter({ id: jobId }); return jobs[0]; },
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

  /* ── Derived ─────────────────────────────────────────────────────────────── */
  const isEmployer = job?.employer_email === user?.email;
  const isJobber   = job?.selected_applicant_email === user?.email;
  const isOverdue  = job?.deadline && isPast(new Date(job.deadline + 'T23:59:59'));

  const sortedKpis      = [...kpis].sort((a, b) => b.weight - a.weight);
  const completedKpis   = sortedKpis.filter(k => k.status === 'approved');
  const inProgressKpis  = sortedKpis.filter(k => k.status === 'submitted' || k.status === 'in_progress');
  const notStartedKpis  = sortedKpis.filter(k => k.status === 'not_started' || k.status === 'rejected');
  const groupedKpis     = isEmployer
    ? [...completedKpis, ...inProgressKpis, ...notStartedKpis]
    : sortedKpis;

  const getProofForKpi = (kpiId) => proofs.find(p => p.kpi_id === kpiId);

  /* ── Loading / not found ─────────────────────────────────────────────────── */
  if (loadingJob || loadingKpis) {
    return (
      <div className="space-y-4 pb-8">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!job) return <div className="text-center py-20 text-sm text-muted-foreground">Job not found.</div>;

  const systemState = getSystemState(job, kpis, proofs);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="pb-20 lg:pb-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl font-semibold text-foreground truncate">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${systemState.style}`}>
              {systemState.label}
            </span>
            <DeadlineCountdown deadline={job.deadline} jobStatus={job.status} />
            <span className="text-xs text-muted-foreground">
              {isEmployer
                ? `Talent: @${job.selected_applicant_username}`
                : `Project: @${job.employer_username}`}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate(`/chat?jobId=${jobId}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
        >
          <MessageSquare className="w-4 h-4" /> Chat
        </button>
      </div>

      {/* Banners */}
      {isOverdue && job.status !== 'completed' && (
        <Banner
          icon={XCircle}
          message="This job has passed its deadline. New submissions are flagged. Coordinate with your project to resolve."
          variant="danger"
        />
      )}
      {systemState.label === 'At Risk' && (
        <Banner icon={AlertTriangle} message="This job is at risk due to inactivity." variant="danger" />
      )}

      {/* Extension states */}
      {isEmployer && job.extension_requested && <ExtensionReviewCard job={job} />}
      {isJobber && job.extension_requested && job.extension_status === 'pending' && (
        <Banner icon={Timer} message="Extension request pending project review." variant="warn" />
      )}
      {isJobber && job.extension_status === 'approved' && (
        <Banner icon={CheckCircle2} message="Deadline extension approved." variant="success" />
      )}
      {isJobber && job.extension_status === 'rejected' && (
        <Banner icon={XCircle} message="Extension request was rejected." variant="danger" />
      )}

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* KPI Task Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">KPI Task Board</h2>
            {isJobber && !isOverdue && !job.extension_requested && (
              <button
                onClick={() => setShowExtension(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Timer className="w-3.5 h-3.5" /> Request Extension
              </button>
            )}
          </div>

          {/* Group labels (employer only) */}
          {isEmployer && completedKpis.length > 0 && (
            <p className="text-xs uppercase tracking-wider text-primary font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </p>
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
                    <p className="text-xs uppercase tracking-wider text-muted-foreground pt-2">{groupLabel}</p>
                  )}
                  <KPICard kpi={kpi} showStatus>
                    {proof ? (
                      <div className="mt-3 p-3 rounded-xl bg-secondary/50 border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const cfg  = proofStatusConfig[proof.status];
                              const Icon = cfg.icon;
                              return <Icon className={`w-3.5 h-3.5 ${proofStatusColors[proof.status]}`} />;
                            })()}
                            <span className="text-xs text-muted-foreground">
                              {proofStatusConfig[proof.status].label}
                            </span>
                          </div>
                          <span className={`text-xs font-medium capitalize ${proofStatusColors[proof.status]}`}>
                            {proof.status}
                          </span>
                        </div>
                        <a
                          href={proof.proof_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
                        >
                          <ExternalLink className="w-3 h-3" /> {proof.proof_link}
                        </a>
                        <p className="text-xs text-muted-foreground">Metric: {proof.metric_achieved}</p>
                        {proof.status === 'rejected' && proof.rejection_reason && (
                          <p className="text-xs text-destructive">Reason: {proof.rejection_reason}</p>
                        )}
                        {isEmployer && proof.status === 'pending' && (
                          <button
                            onClick={() => { setReviewProof(proof); setReviewKpi(kpi); }}
                            className="w-full mt-1 h-8 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            Review Proof
                          </button>
                        )}
                      </div>
                    ) : (
                      isJobber && kpi.status !== 'approved' && (
                        <button
                          onClick={() => setProofKpi(kpi)}
                          className="w-full mt-3 h-9 rounded-xl border border-primary/30 text-primary text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" /> Submit Proof
                        </button>
                      )
                    )}
                  </KPICard>
                </React.Fragment>
              );
            })}
          </div>

          {/* Activity log */}
          <div className="mt-4">
            <ActivityLog proofs={proofs} kpis={kpis} job={job} />
          </div>
        </div>

        {/* Performance panel */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Performance</h2>
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
