import React, { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Clock, Loader2, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { addHours, format } from 'date-fns';
import { Job, Notification } from '@/api/entities';

// TALENT: submit an extension request
export function ExtensionRequestDialog({ job, open, onClose }) {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState('24');
  const [reason, setReason] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      await Job.update(job.id, {
        extension_requested: true,
        extension_hours: Number(hours),
        extension_reason: reason,
        extension_status: 'pending',
      });
      await Notification.create({
        user_email: job.employer_email,
        type: 'application_received',
        title: 'Extension Requested',
        message: `@${job.selected_applicant_username} is requesting a ${hours}h deadline extension: "${reason}"`,
        job_id: job.id,
      });
    },
    onSuccess: () => {
      toast.success('Extension request submitted!');
      queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Request Extension
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ask your project for more time to complete this job.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div>
            <Label className="text-xs">Additional Time (hours) *</Label>
            <Input
              type="number"
              min="1"
              max="168"
              placeholder="e.g. 24"
              value={hours}
              onChange={e => setHours(e.target.value)}
              className="bg-secondary/50 border-border mt-1.5"
            />
            {hours && Number(hours) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                New deadline would be approx. {format(addHours(new Date(), Number(hours)), 'MMM d, HH:mm')}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Reason *</Label>
            <Textarea
              placeholder="Explain why you need more time..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-secondary/50 border-border mt-1.5 min-h-[80px]"
            />
          </div>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!hours || !reason.trim() || submitMutation.isPending}
            className="w-full bg-primary text-primary-foreground gap-2"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// PROJECT: review an extension request
export function ExtensionReviewCard({ job }) {
  const queryClient = useQueryClient();
  const [customHours, setCustomHours] = useState(String(job.extension_hours || ''));

  const reviewMutation = useMutation({
    mutationFn: async ({ approved }) => {
      if (approved) {
        const currentDeadline = job.deadline ? new Date(job.deadline + 'T23:59:59') : new Date();
        const newDeadline = addHours(currentDeadline, Number(customHours));
        await Job.update(job.id, {
          extension_status: 'approved',
          deadline: format(newDeadline, 'yyyy-MM-dd'),
        });
        await Notification.create({
          user_email: job.selected_applicant_email,
          type: 'job_accepted',
          title: 'Extension Approved',
          message: `Your extension request was approved. New deadline: ${format(newDeadline, 'MMM d, yyyy')}`,
          job_id: job.id,
        });
      } else {
        await Job.update(job.id, { extension_status: 'rejected' });
        await Notification.create({
          user_email: job.selected_applicant_email,
          type: 'proof_rejected',
          title: 'Extension Rejected',
          message: 'Your deadline extension request was rejected by the project.',
          job_id: job.id,
        });
      }
    },
    onSuccess: () => {
      toast.success('Extension reviewed!');
      queryClient.invalidateQueries({ queryKey: ['job', job.id] });
    },
  });

  if (!job.extension_requested || job.extension_status !== 'pending') return null;

  return (
    <div className="p-4 rounded-xl border border-chart-3/40 bg-chart-3/5 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-chart-3" />
        <span className="text-sm font-semibold text-foreground">Extension Request</span>
        <Badge className="bg-chart-3/20 text-chart-3 text-xs ml-auto">Pending Review</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        @{job.selected_applicant_username} is requesting <strong className="text-foreground">{job.extension_hours}h</strong> more time.
      </p>
      <p className="text-xs text-foreground italic">"{job.extension_reason}"</p>
      <div>
        <Label className="text-xs">Approve with hours (editable)</Label>
        <Input
          type="number"
          min="1"
          value={customHours}
          onChange={e => setCustomHours(e.target.value)}
          className="bg-secondary/50 border-border mt-1.5 w-32"
        />
      </div>
      <div className="flex gap-3">
        <Button
          size="sm"
          onClick={() => reviewMutation.mutate({ approved: true })}
          disabled={!customHours || reviewMutation.isPending}
          className="bg-accent text-accent-foreground gap-1.5 flex-1"
        >
          {reviewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => reviewMutation.mutate({ approved: false })}
          disabled={reviewMutation.isPending}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 flex-1 gap-1.5"
        >
          <XCircle className="w-3.5 h-3.5" /> Reject
        </Button>
      </div>
    </div>
  );
}