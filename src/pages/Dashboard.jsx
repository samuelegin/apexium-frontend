import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useMode } from '@/lib/ModeContext';

import { useQuery } from '@tanstack/react-query';
import { Plus, Briefcase, CheckCircle2, TrendingUp, Flame, ArrowRight, Search, Users, Zap, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import JobCard from '@/components/shared/JobCard';
import PIScoreGauge from '@/components/shared/PIScoreGauge';
import { motion, AnimatePresence } from 'framer-motion';
import XPBadge, { getProgress, getNextThreshold } from '@/components/growth/XPBadge';
import { Job } from '@/api/entities';

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className={`border-border ${accent ? 'border-primary/20 bg-primary/5' : 'bg-card'}`}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/20' : 'bg-secondary'}`}>
            <Icon className={`w-5 h-5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployerDashboard({ user }) {
  const { data: myEmployerJobs = [], isLoading } = useQuery({
    queryKey: ['my-employer-jobs', user?.email],
    queryFn: () => Job.filter({ employer_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const activeJobs = myEmployerJobs.filter(j => j.status === 'open' || j.status === 'in_progress');
  const completedJobs = myEmployerJobs.filter(j => j.status === 'completed');
  const totalApplicants = myEmployerJobs.reduce((sum, j) => sum + (j.applicant_count || 0), 0);

  return (
    <div className="space-y-8 pb-20 lg:pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-full">Employer Mode</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome{user?.username ? `, @${user.username}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your jobs and track hired talent</p>
        </div>
        <Link to="/post-job">
          <Button className="bg-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Post Job
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="bg-card border-border"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard icon={Briefcase} label="Active Jobs" value={activeJobs.length} accent />
            <StatCard icon={CheckCircle2} label="Completed" value={completedJobs.length} />
            <StatCard icon={Users} label="Total Applicants" value={totalApplicants} />
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Posted Jobs</h2>
          <Link to="/my-jobs" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {myEmployerJobs.slice(0, 5).map(job => (
              <JobCard key={job.id} job={job} />
            ))}
            {myEmployerJobs.length === 0 && (
              <Card className="bg-card border-border border-dashed">
                <CardContent className="p-10 text-center">
                  <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">No jobs posted yet</p>
                  <Link to="/post-job">
                    <Button className="bg-primary text-primary-foreground gap-2">
                      <Plus className="w-4 h-4" /> Post Your First Job
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JobberDashboard({ user }) {
  const { data: myJobberJobs = [], isLoading } = useQuery({
    queryKey: ['my-jobber-jobs', user?.email],
    queryFn: () => Job.filter({ selected_applicant_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const activeJobs = myJobberJobs.filter(j => j.status === 'in_progress');
  const completedJobs = myJobberJobs.filter(j => j.status === 'completed');
  const avgScore = user?.average_pi_score || 0;

  return (
    <div className="space-y-8 pb-20 lg:pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent border border-accent/30 bg-accent/10 px-2 py-0.5 rounded-full">Jobber Mode</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome{user?.username ? `, @${user.username}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track your work and grow your PI Score</p>
        </div>
        <Link to="/marketplace">
          <Button className="bg-accent text-accent-foreground gap-2">
            <Search className="w-4 h-4" /> Find Work
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {isLoading ? (
          Array(2).fill(0).map((_, i) => (
            <Card key={i} className="bg-card border-border"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard icon={TrendingUp} label="Active Jobs" value={activeJobs.length} accent />
            <StatCard icon={Flame} label="Completed" value={completedJobs.length} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Active Work</h2>
            <Link to="/my-jobs" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {myJobberJobs.slice(0, 5).map(job => (
                <JobCard key={job.id} job={job} />
              ))}
              {myJobberJobs.length === 0 && (
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="p-10 text-center">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm mb-4">No active work yet. Browse the marketplace to apply.</p>
                    <Link to="/marketplace">
                      <Button className="bg-accent text-accent-foreground gap-2">
                        <Search className="w-4 h-4" /> Browse Marketplace
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Performance</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-6 flex flex-col items-center">
              <PIScoreGauge score={avgScore} size="lg" />
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Your average PI Score across completed jobs
              </p>
            </CardContent>
          </Card>

          {/* XP Widget */}
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <XPBadge xp={user?.xp_total || 0} />
                <Link to="/xp-activity" className="text-xs text-primary hover:underline">View log</Link>
              </div>
              {(() => {
                const xp = user?.xp_total || 0;
                const progress = getProgress(xp);
                const next = getNextThreshold(xp);
                return next ? (
                  <div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{next - xp} XP to next level</p>
                  </div>
                ) : null;
              })()}
              <div className="flex gap-2">
                <Link to="/tasks" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs border-accent/30 text-accent hover:bg-accent/10">
                    <CheckSquare className="w-3.5 h-3.5" /> Tasks
                  </Button>
                </Link>
                <Link to="/referrals" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10">
                    <Users className="w-3.5 h-3.5" /> Refer
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Career Stats</div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Jobs</span>
                  <span className="font-mono font-medium text-foreground">{myJobberJobs.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-mono font-medium text-foreground">{activeJobs.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-mono font-medium text-foreground">{completedJobs.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { mode, isEmployer } = useMode();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {isEmployer
          ? <EmployerDashboard user={user} />
          : <JobberDashboard user={user} />
        }
      </motion.div>
    </AnimatePresence>
  );
}