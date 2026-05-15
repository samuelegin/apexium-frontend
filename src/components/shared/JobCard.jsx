import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, DollarSign, ChevronRight, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const categoryLabels = {
  marketing: 'Marketing', development: 'Development', design: 'Design',
  content: 'Content', sales: 'Sales', community: 'Community',
  analytics: 'Analytics', operations: 'Operations', other: 'Other',
};

export default function JobCard({ job }) {
  return (
    <Link to={`/job/${job.id}`} className="block group">
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{categoryLabels[job.category] || job.category}</Badge>
              {job.status === 'open' && (
                <Badge className="bg-accent/20 text-accent text-xs">Open</Badge>
              )}
              {job.status === 'in_progress' && (
                <Badge className="bg-chart-3/20 text-chart-3 text-xs">Active</Badge>
              )}
              {job.status === 'completed' && (
                <Badge className="bg-emerald/20 text-emerald text-xs">Completed</Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-base md:text-lg group-hover:text-primary transition-colors truncate">
              {job.title}
            </h3>
            {job.kpi_summary && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Flame className="w-3 h-3 text-chart-3" />
                {job.kpi_summary}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground">${job.payment_amount}</span>
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