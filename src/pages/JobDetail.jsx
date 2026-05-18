import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, DollarSign, Calendar, Users, Send,
  Loader2, CheckCircle2, User, Info, Crown,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Job, KPI, Application, Notification, User as UserEntity } from '@/api/entities';
import { checkCanApply } from '@/lib/applicationGuards';
import KPICard from '@/components/shared/KPICard.jsx';
import ProposalHelper from '@/components/jobdetail/ProposalHelper';
import PodBuilder from '@/components/jobdetail/PodBuilder';
import QuickApplyButton from '@/components/jobdetail/QuickApplyButton';
import ApplicantsList from '@/components/jobdetail/ApplicantsList';
import { useEscrow } from '@/hooks/useEscrow';

const STATUS_STYLES = {
  open:        'bg-primary/10 text-primary',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
};

export default function JobDetail() {
  const jobId = new URLSearchParams(window.location.search).get('id') || window.location.pathname.split('/').pop();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const queryClient = useQueryClient();
  const escrow     = useEscrow();

  const [proposal,    setProposal]    = useState('');
  const [applyMode,   setApplyMode]   = useState('individual');
  const [podName,     setPodName]     = useState('');
  const [podMembers,  setPodMembers]  = useState([]);

  /* ── Queries ─────────────────────────────────────────────────────────────── */
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

  const { data: applications = [] } = useQuery({
    queryKey: ['job-applications', jobId],
    queryFn: () => Application.filter({ job_id: jobId }),
  });

  const { data: myApplication } = useQuery({
    queryKey: ['my-application', jobId, user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const apps = await Application.filter({ job_id: jobId, applicant_email: user.email });
      return apps[0] || null;
    },
    enabled: !!user?.email,
  });

  /* ── Derived state ───────────────────────────────────────────────────────── */
  const isEmployer       = job?.employer_email === user?.email;
  const isSelectedJobber = job?.selected_applicant_email === user?.email;
  const sortedKpis       = [...kpis].sort((a, b) => b.weight - a.weight);
  const podTotalShare    = podMembers.reduce((sum, m) => sum + (Number(m.share) || 0), 0);
  const podValid         = applyMode === 'individual'
    || (podName.trim() && podMembers.length >= 2 && podMembers.length <= 5 && podTotalShare === 100);

  /* ── Mutations ───────────────────────────────────────────────────────────── */
  const applyMutation = useMutation({
    mutationFn: async () => {
      const existingApps = await Application.filter({ job_id: jobId, applicant_email: user.email });
      if (existingApps.length > 0) throw new Error('You already applied to this job.');

      const { allowed, reason } = await checkCanApply(user.email);
      if (!allowed) {
        if (reason?.startsWith('cooldown:')) throw new Error(`Please wait ${reason.split(':')[1]}s before applying again.`);
        else if (reason === 'daily_limit') throw new Error('Daily application limit reached. Try again tomorrow.');
        throw new Error('Cannot apply right now.');
      }

      const isPod = applyMode === 'pod';
      let perfSnapshot = {};
      try {
        const completedJobs = await Job.filter({ selected_applicant_email: user.email, status: 'completed' });
        const kpiResults = completedJobs.length > 0
          ? await Promise.all(completedJobs.slice(0, 5).map(j => KPI.filter({ job_id: j.id })))
          : [];
        const allKpis = kpiResults.flat();
        const approved = allKpis.filter(k => k.status === 'approved').length;
        const catCounts = {};
        completedJobs.forEach(j => { if (j.category) catCounts[j.category] = (catCounts[j.category] || 0) + 1; });
        const topCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
        perfSnapshot = {
          completed_jobs: completedJobs.length,
          kpi_success_rate: allKpis.length > 0 ? Math.round((approved / allKpis.length) * 100) : 0,
          avg_pi_score: user?.average_pi_score || 0,
          top_categories: topCategories,
        };
      } catch (_) {}

      await Application.create({
        job_id: jobId,
        applicant_email: user.email,
        applicant_username: user.username || user.full_name,
        proposal,
        status: 'pending',
        application_type: 'manual',
        is_pod: isPod,
        pod_name: isPod ? podName.trim() : undefined,
        pod_members: isPod ? podMembers : undefined,
        performance_snapshot: perfSnapshot,
        file_url: user?.cv_url || undefined,
      });
      await Job.update(jobId, { applicant_count: (job.applicant_count || 0) + 1 });
      await Notification.create({
        user_email: job.employer_email,
        type: 'application_received',
        title: 'New Application',
        message: isPod
          ? `Pod "${podName}" applied to "${job.title}"`
          : `@${user.username || user.full_name} applied to "${job.title}"`,
        job_id: jobId,
      });
    },
    onSuccess: () => {
      toast.success('Application submitted!');
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
    onError: (err) => toast.error(err.message || 'Submission failed.'),
  });

  const selectMutation = useMutation({
    mutationFn: async (app) => {
      let jobberWallet = null;
      try {
        const jobberUsers = await UserEntity.filter({ email: app.applicant_email });
        jobberWallet = jobberUsers[0]?.wallet_address || null;
      } catch (_) {}
      await Job.update(jobId, {
        status: 'in_progress',
        selected_applicant_email: app.applicant_email,
        selected_applicant_username: app.applicant_username,
        jobber_wallet: jobberWallet,
      });
      await Application.update(app.id, { status: 'accepted' });
      await Notification.create({
        user_email: app.applicant_email,
        type: 'selected_for_job',
        title: 'You were selected!',
        message: `You've been selected for "${job.title}"`,
        job_id: jobId,
      });
    },
    onSuccess: () => {
      toast.success('Talent selected!');
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
    },
  });

  const retryFundingMutation = useMutation({
    mutationFn: async () => {
      const result = await escrow.fundJob(jobId, '0x0000000000000000000000000000000000000000', job.payment_amount);
      if (!result.success) {
        await Job.update(jobId, { escrow_error: result.error });
        throw new Error(result.error);
      } else {
        await Job.update(jobId, { escrow_tx_hash: result.txHash, escrow_funded: true, escrow_error: null });
      }
    },
    onSuccess: () => {
      toast.success('Escrow funded! Job is now visible.');
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
    onError: (err) => toast.error(`Funding failed: ${err.message}`),
  });

  const deleteJobMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/jobs/cleanup-unfunded/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => { toast.success('Job deleted.'); navigate('/'); },
    onError:   (err) => toast.error(`Delete failed: ${err.message}`),
  });

  /* ── Loading / not found ─────────────────────────────────────────────────── */
  if (loadingJob) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-8">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">Job not found.</div>
    );
  }

  if ((job.status === 'in_progress' || job.status === 'completed') && (isEmployer || isSelectedJobber)) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <p className="text-foreground font-medium">This job is active</p>
        <button
          onClick={() => navigate(`/active-job/${jobId}`)}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Go to Active Job Board
        </button>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto pb-20 lg:pb-8 space-y-6">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
                {job.category}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[job.status] || 'bg-secondary text-muted-foreground'}`}>
                {job.status?.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-foreground leading-snug">{job.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Posted by @{job.employer_username}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">${job.payment_amount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {job.deadline ? format(new Date(job.deadline), 'MMM d, yyyy') : 'No deadline'}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {job.applicant_count || 0} applicants
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Performance KPIs</h2>
        {loadingKpis ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedKpis.map(kpi => <KPICard key={kpi.id} kpi={kpi} />)}
          </div>
        )}
      </div>

      {/* Already applied */}
      {myApplication && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <span className="text-sm text-foreground">
            You've applied to this job —{' '}
            <span className="text-muted-foreground capitalize">{myApplication.status}</span>
          </span>
        </div>
      )}

      {/* Apply section */}
      {!isEmployer && job.status === 'open' && !myApplication && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Apply for this job</h2>

          {/* Apply type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border bg-secondary/30 p-0.5 gap-0.5">
            {[
              { key: 'individual', label: 'Individual', icon: User },
              { key: 'pod',        label: 'Pod',        icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setApplyMode(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  applyMode === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* Quick apply (individual) */}
          {applyMode === 'individual' && (
            <>
              <QuickApplyButton user={user} job={job} jobId={jobId} onApplied={() => {}} />
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or write a proposal</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {/* Pod builder */}
          {applyMode === 'pod' && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground mb-3">
                Build your pod — min 2, max 5 members. Reward split must total 100%.
              </p>
              <PodBuilder
                currentUser={user}
                podName={podName}
                setPodName={setPodName}
                members={podMembers}
                setMembers={setPodMembers}
              />
            </div>
          )}

          {/* Proposal helper + textarea */}
          <ProposalHelper jobTitle={job.title} onInsert={(text) => setProposal(text)} />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Your proposal — explain how you'll achieve the KPIs above
            </label>
            <Textarea
              placeholder="Describe your approach and why you're a great fit…"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              className="bg-background border-border min-h-[120px] resize-none"
            />
            {proposal.trim().length > 0 && proposal.trim().length < 30 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Info className="w-3 h-3" /> Add more detail to strengthen your proposal.
              </p>
            )}
          </div>

          {/* Pod summary */}
          {applyMode === 'pod' && podMembers.length >= 2 && podTotalShare === 100 && podName.trim() && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Pod Summary</p>
              <p className="text-sm font-medium text-foreground">{podName}</p>
              <div className="space-y-1.5">
                {podMembers.map((m, i) => (
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

          {applyMode === 'pod' && !podValid && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {!podName.trim()
                ? 'Enter a pod name.'
                : podMembers.length < 2
                ? 'Add at least 1 more member (min 2 total).'
                : `Reward split is ${podTotalShare}% — must equal 100%.`}
            </p>
          )}

          <button
            onClick={() => applyMutation.mutate()}
            disabled={!proposal.trim() || applyMutation.isPending || !podValid}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {applyMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : <><Send className="w-4 h-4" /> {applyMode === 'pod' ? 'Submit Pod Application' : 'Submit Application'}</>
            }
          </button>
        </div>
      )}

      {/* Project — escrow error */}
      {isEmployer && !job.escrow_funded && job.escrow_error && (
        <div className="bg-card rounded-2xl border border-destructive/20 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-destructive" />
            <h2 className="text-base font-semibold text-destructive">Escrow funding failed</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This job was created but escrow funding failed. It won't be visible to talents until funded.
          </p>
          <div className="bg-destructive/8 rounded-xl p-3">
            <p className="text-xs font-mono text-destructive">{job.escrow_error}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => retryFundingMutation.mutate()}
              disabled={retryFundingMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {retryFundingMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Funding…</>
                : <><DollarSign className="w-4 h-4" /> Retry Funding</>
              }
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this unfunded job?')) deleteJobMutation.mutate();
              }}
              disabled={deleteJobMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-60"
            >
              {deleteJobMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Job
            </button>
          </div>
        </div>
      )}

      {/* Project — applicants */}
      {isEmployer && job.status === 'open' && job.escrow_funded && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            Applicants ({applications.length})
          </h2>
          <ApplicantsList
            applications={applications}
            onSelect={(app) => selectMutation.mutate(app)}
            selectPending={selectMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
