import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, DollarSign, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const categoryLabels = {
  marketing: 'Marketing', development: 'Development', design: 'Design',
  content: 'Content', sales: 'Sales', community: 'Community',
  analytics: 'Analytics', operations: 'Operations', other: 'Other',
};

const statusStyles = {
  open:        'bg-primary/10 text-primary',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  completed:   'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
};

const statusLabels = {
  open:        'Open',
  in_progress: 'Active',
  completed:   'Completed',
};

export default function JobCard({ job }) {
  return (
    <Link to={`/job/${job.id}`} className="block group">
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 transition-all hover:border-primary/30 hover:bg-secondary/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground capitalize">
                {categoryLabels[job.category] || job.category}
              </span>
              {job.status && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[job.status] || 'bg-secondary text-muted-foreground'}`}>
                  {statusLabels[job.status] || job.status}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-sm md:text-base group-hover:text-primary transition-colors truncate">
              {job.title}
            </h3>
            {job.kpi_summary && (
              <p className="text-xs text-muted-foreground mt-1.5 truncate">
                KPIs: {job.kpi_summary}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">${job.payment_amount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{job.deadline ? format(new Date(job.deadline), 'MMM d') : 'No deadline'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{job.applicant_count || 0} applied</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
