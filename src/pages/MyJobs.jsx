import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import JobCard from '@/components/shared/JobCard';
import { Briefcase, UserCheck, Trash2, Loader2 } from 'lucide-react';
import { Application, Job } from '@/api/entities';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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

  // Only allow delete if job is still open (not started)
  if (job.status !== 'open') return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setConfirm(true)}
        className="text-destructive hover:bg-destructive/10 h-8 w-8"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">"{job.title}"</span>?
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-destructive text-destructive-foreground gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MyJobs() {
  const { user } = useAuth();

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

  const renderJobs = (jobs, emptyMsg, showDelete = false) => {
    if (isLoading) return (
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
    if (jobs.length === 0) return (
      <p className="text-center py-12 text-muted-foreground text-sm">{emptyMsg}</p>
    );
    return (
      <div className="space-y-3">
        {jobs.map(j => (
          <div key={j.id} className="relative group">
            <Link to={`/job/${j.id}`}>
              <JobCard job={j} />
            </Link>
            {showDelete && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <DeleteJobButton job={j} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Jobs</h1>

      <Tabs defaultValue="employer" className="w-full">
        <TabsList className="bg-secondary w-full justify-start">
          <TabsTrigger value="employer" className="gap-2">
            <Briefcase className="w-3.5 h-3.5" /> As Employer
          </TabsTrigger>
          <TabsTrigger value="jobber" className="gap-2">
            <UserCheck className="w-3.5 h-3.5" /> As Jobber
          </TabsTrigger>
          <TabsTrigger value="applied">Applied</TabsTrigger>
        </TabsList>

        <TabsContent value="employer" className="mt-4">
          {renderJobs(employerJobs, 'No jobs posted yet', true)}
        </TabsContent>
        <TabsContent value="jobber" className="mt-4">
          {renderJobs(jobberJobs, 'No active work yet')}
        </TabsContent>
        <TabsContent value="applied" className="mt-4">
          {renderJobs(appliedJobs, 'No applications yet')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
