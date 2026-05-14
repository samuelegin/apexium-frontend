import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, Calendar, Users, Send, Loader2, CheckCircle2, User, Info, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

export default function JobDetail() {
  const jobId = new URLSearchParams(window.location.search).get('id') || window.location.pathname.split('/').pop();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const escrow = useEscrow();
  const [proposal, setProposal] = useState('');
  const [applyMode, setApplyMode] = useState('individual'); // 'individual' | 'pod'
  const [podName, setPodName] = useState('');
  const [podMembers, setPodMembers] = useState([]);

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

  const isEmployer = job?.employer_email === user?.email;
  const isSelectedJobber = job?.selected_applicant_email === user?.email;
  const sortedKpis = [...kpis].sort((a, b) => b.weight - a.weight);

  // podMembers always includes admin at index 0 (managed by PodBuilder)
  const podTotalShare = podMembers.reduce((sum, m) => sum + (Number(m.share) || 0), 0);
  const podValid = applyMode === 'individual'
    || (podName.trim() && podMembers.length >= 2 && podMembers.length <= 5 && podTotalShare === 100);

  const applyMutation = useMutation({
    mutationFn: async () => {
      // Prevent duplicate applications from the same user
      const existingApps = await Application.filter({ job_id: jobId, applicant_email: user.email });
      if (existingApps.length > 0) {
        throw new Error('You already applied to this job.');
      }

      // Anti-spam guard
      const { allowed, reason } = await checkCanApply(user.email);
      if (!allowed) {
        if (reason?.startsWith('cooldown:')) {
          throw new Error(`Please wait ${reason.split(':')[1]}s before applying again.`);
        } else if (reason === 'daily_limit') {
          throw new Error('Daily application limit reached. Try again tomorrow.');
        }
        throw new Error('Cannot apply right now.');
      }

      const isPod = applyMode === 'pod';

      // Collect performance snapshot for manual apply too
      let perfSnapshot = {};
      try {
        const completedJobs = await Job.filter({
          selected_applicant_email: user.email,
          status: 'completed',
        });
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
      recordApplicationTimestamp();
    },
    onSuccess: () => {
      toast.success('Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Submission failed.');
    },
  });

  const selectMutation = useMutation({
    mutationFn: async (app) => {
      // Look up jobber's saved wallet address so the relayer can pay them
      let jobberWallet = null;
      try {
        const jobberUsers = await UserEntity.filter({ email: app.applicant_email });
        jobberWallet = jobberUsers[0]?.wallet_address || null;
      } catch (_) {}

      await Job.update(jobId, {
        status: 'in_progress',
        selected_applicant_email: app.applicant_email,
        selected_applicant_username: app.applicant_username,
        jobber_wallet: jobberWallet,  // relayer needs this to call release()
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
      toast.success('Jobber selected!');
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
      toast.success('Escrow funded successfully! Job is now visible.');
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
    onError: (err) => {
      toast.error(`Funding failed: ${err.message}`);
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/jobs/cleanup-unfunded/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Job deleted.');
      navigate('/'); // Go back to dashboard
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
    },
  });

  if (loadingJob) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!job) {
    return <div className="text-center py-20 text-muted-foreground">Job not found</div>;
  }

  // If job is in_progress and user is employer or selected jobber, redirect to active view
  if ((job.status === 'in_progress' || job.status === 'completed') && (isEmployer || isSelectedJobber)) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-4" />
        <p className="text-foreground mb-4">This job is active</p>
        <Button onClick={() => navigate(`/active-job/${jobId}`)} className="bg-primary text-primary-foreground">
          Go to Active Job Board
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 lg:pb-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      {/* Job Header */}
      <div>
        <Badge variant="outline" className="mb-2">{job.category}</Badge>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{job.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">Posted by @{job.employer_username}</p>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
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
        <h2 className="text-lg font-semibold text-foreground mb-4">Performance KPIs</h2>
        {loadingKpis ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-3">
            {sortedKpis.map(kpi => <KPICard key={kpi.id} kpi={kpi} />)}
          </div>
        )}
      </div>

      {/* Apply Section */}
      {!isEmployer && job.status === 'open' && !myApplication && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Apply for this Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Apply type toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border bg-secondary/30 p-0.5 gap-0.5">
              {[
                { key: 'individual', label: 'Individual', icon: User },
                { key: 'pod', label: 'Pod', icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setApplyMode(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    applyMode === key
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {/* Quick Apply — individual only */}
            {applyMode === 'individual' && (
              <>
                <QuickApplyButton
                  user={user}
                  job={job}
                  jobId={jobId}
                  onApplied={() => {}}
                />
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or apply manually</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            {/* Pod Builder */}
            {applyMode === 'pod' && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-3">Build your pod — min 2, max 5 members. Reward split must total 100%.</p>
                <PodBuilder
                  currentUser={user}
                  podName={podName}
                  setPodName={setPodName}
                  members={podMembers}
                  setMembers={setPodMembers}
                />
              </div>
            )}

            {/* Manual proposal */}
            <ProposalHelper jobTitle={job.title} onInsert={(text) => setProposal(text)} />
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">Your Proposal</span>
                <span className="text-xs text-muted-foreground">— explain how you'll achieve the KPIs above</span>
              </div>
              <Textarea
                placeholder="Describe your approach and why you're a great fit for this job..."
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                className="bg-card border-border min-h-[120px]"
              />
              {proposal.trim().length > 0 && proposal.trim().length < 30 && (
                <p className="text-xs text-chart-3 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Add more detail to strengthen your proposal.
                </p>
              )}
            </div>

            {/* Pod Summary */}
            {applyMode === 'pod' && podMembers.length >= 2 && podTotalShare === 100 && podName.trim() && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider">Pod Summary</p>
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
              <p className="text-xs text-chart-3 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {!podName.trim() ? 'Enter a pod name.' : podMembers.length < 2 ? 'Add at least 1 more member (min 2 total).' : podTotalShare !== 100 ? `Reward split is ${podTotalShare}% — must equal 100%.` : ''}
              </p>
            )}

            <Button
              onClick={() => applyMutation.mutate()}
              disabled={!proposal.trim() || applyMutation.isPending || !podValid}
              className="bg-primary text-primary-foreground gap-2 w-full transition-all active:scale-95"
            >
              {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {applyMutation.isPending ? 'Submitting...' : applyMode === 'pod' ? 'Submit Pod Application' : 'Submit Application'}
            </Button>
          </CardContent>
        </Card>
      )}

      {myApplication && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <span className="text-sm text-foreground">You've applied to this job ({myApplication.status})</span>
          </CardContent>
        </Card>
      )}

      {/* Employer: Escrow Error Handling */}
      {isEmployer && !job.escrow_funded && job.escrow_error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <Info className="w-4 h-4" />
              Escrow Funding Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This job was created but escrow funding failed. The job is not visible to jobbers until funded.
            </p>
            <div className="bg-destructive/10 rounded-lg p-3">
              <p className="text-xs font-mono text-destructive">{job.escrow_error}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => retryFundingMutation.mutate()}
                disabled={retryFundingMutation.isPending}
                className="bg-primary text-primary-foreground gap-2"
              >
                {retryFundingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {retryFundingMutation.isPending ? 'Funding...' : 'Retry Funding'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this unfunded job?')) {
                    deleteJobMutation.mutate();
                  }
                }}
                disabled={deleteJobMutation.isPending}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2"
              >
                {deleteJobMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete Job
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employer: View Applicants */}
      {isEmployer && job.status === 'open' && job.escrow_funded && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Applicants ({applications.length})</h2>
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