import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import JobCard from '@/components/shared/JobCard';
import { Briefcase, UserCheck, ClipboardList, Trash2, Loader2, Search, Plus } from 'lucide-react';
import { Application, Job } from '@/api/entities';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

/* ── Delete button (employer only, open jobs) ───────────────────────────────── */
function DeleteJobButton({ job }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => Job.delete(job.id),
    onSuccess: () => {
      toast.success('Job deleted');
      queryClient.invalidateQueries({ queryKey: ['my-employer-jobs'] });
      setConfirm(false);
    },
    onError: () => toast.error('Failed to delete job'),
  });

  if (job.status !== 'open') return null;

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setConfirm(true); }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">"{job.title}"</span>?
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 h-9 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/90 transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Tab button ─────────────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
          active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── Job list renderer ──────────────────────────────────────────────────────── */
function JobList({ jobs, isLoading, emptyMessage, emptyTo, emptyCta, showDelete }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-14 text-center">
        <p className="text-sm text-muted-foreground mb-3">{emptyMessage}</p>
        {emptyTo && (
          <Link to={emptyTo}>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              {emptyCta}
            </button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <div key={job.id} className="relative group">
          <JobCard job={job} />
          {showDelete && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteJobButton job={job} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function MyJobs() {
  const { user } = useAuth();
  const [tab, setTab] = useState('employer');

  const { data: employerJobs = [], isLoading: le } = useQuery({
    queryKey: ['my-employer-jobs', user?.email],
    queryFn: () => Job.filter({ employer_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: jobberJobs = [], isLoading: lj } = useQuery({
    queryKey: ['my-jobber-jobs', user?.email],
    queryFn: () => Job.filter({ selected_applicant_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: appliedJobs = [], isLoading: la } = useQuery({
    queryKey: ['my-applications', user?.email],
    queryFn: async () => {
      const apps = await Application.filter({ applicant_email: user?.email });
      if (apps.length === 0) return [];
      const jobIds = [...new Set(apps.map(a => a.job_id))];
      const allJobs = await Job.list('-created_date', 200);
      return allJobs.filter(j => jobIds.includes(j.id));
    },
    enabled: !!user?.email,
  });

  const isLoading = le || lj || la;

  const tabs = [
    { key: 'employer', label: 'As Project', icon: Briefcase, count: employerJobs.length },
    { key: 'jobber',   label: 'As Talent',   icon: UserCheck,     count: jobberJobs.length },
    { key: 'applied',  label: 'Applied',     icon: ClipboardList, count: appliedJobs.length },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">My Jobs</h1>
        <Link to="/post-job">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Post Job
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <TabBtn
            key={t.key}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
            icon={t.icon}
            label={t.label}
            count={t.count}
          />
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'employer' && (
          <JobList
            jobs={employerJobs}
            isLoading={isLoading}
            emptyMessage="No jobs posted yet."
            emptyTo="/post-job"
            emptyCta={<><Plus className="w-4 h-4" /> Post First Job</>}
            showDelete
          />
        )}
        {tab === 'jobber' && (
          <JobList
            jobs={jobberJobs}
            isLoading={isLoading}
            emptyMessage="No active work yet."
            emptyTo="/marketplace"
            emptyCta={<><Search className="w-4 h-4" /> Browse Marketplace</>}
          />
        )}
        {tab === 'applied' && (
          <JobList
            jobs={appliedJobs}
            isLoading={isLoading}
            emptyMessage="No applications yet."
            emptyTo="/marketplace"
            emptyCta={<><Search className="w-4 h-4" /> Browse Marketplace</>}
          />
        )}
      </div>
    </div>
  );
}
