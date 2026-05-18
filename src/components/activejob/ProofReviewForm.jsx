import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CheckCircle2, XCircle, Loader2, ExternalLink,
  Target, BarChart3, Flame, TrendingUp, ShieldCheck, Coins,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Job, KPI, Notification, ProofSubmission } from '@/api/entities';

const QUICK_REJECT_REASONS = [
  'Incorrect metric — does not match the target',
  'Invalid proof — link is inaccessible or unrelated',
  'Incomplete task — work was not fully done',
];

export default function ProofReviewForm({ proof, kpi, job, open, onClose, allKpis = [] }) {
  const queryClient  = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);

  const currentScore        = allKpis.reduce((sum, k) => sum + (k.weight / 100) * (k.completion_percent || 0), 0);
  const scoreGainIfApproved = kpi ? ((kpi.weight / 100) * (100 - (kpi.completion_percent || 0))) : 0;
  const newScore            = Math.min(100, currentScore + scoreGainIfApproved);

  // Is this the last KPI? Warn the project that approval triggers escrow release.
  const isLastKpi = allKpis.length > 0 &&
    allKpis.filter(k => k.id !== kpi?.id).every(k => k.status === 'approved');

  const reviewMutation = useMutation({
    mutationFn: async ({ approved }) => {
      const updateData = approved
        ? { status: 'approved' }
        : { status: 'rejected', rejection_reason: rejectReason };

      await ProofSubmission.update(proof.id, updateData);

      if (approved) {
        await KPI.update(kpi.id, { status: 'approved', completion_percent: 100 });
      } else {
        await KPI.update(kpi.id, { status: 'rejected', completion_percent: 0 });
      }

      // ── Completion check: if all KPIs approved, mark job complete ──────────
      // The backend relayer listens for job.status → 'completed' and then calls
      // escrow.release(jobId) on-chain to send USDC to the talent.
      if (approved) {
        const allKpisData  = await KPI.filter({ job_id: job.id });
        const updatedKpis  = allKpisData.map(k => k.id === kpi.id ? { ...k, status: 'approved' } : k);
        const allApproved  = updatedKpis.every(k => k.status === 'approved');

        if (allApproved) {
          await Job.update(job.id, {
            status:             'completed',
            last_activity_date: new Date().toISOString(),
          });
          // Backend relayer should detect status:'completed' and call escrow.release()
          // No on-chain call here — escrow release is done server-side via the relayer key.
        }
      }

      await Notification.create({
        user_email: proof.submitter_email,
        type:    approved ? 'proof_approved' : 'proof_rejected',
        title:   approved ? 'Proof Approved! 🎉' : 'Proof Rejected',
        message: approved
          ? `Your proof for "${kpi.name}" was approved!${isLastKpi ? ' All KPIs done — payment is being released.' : ''}`
          : `Your proof for "${kpi.name}" was rejected: ${rejectReason}`,
        job_id: job.id,
      });
    },
    onSuccess: (_, { approved }) => {
      if (approved && isLastKpi) {
        toast.success('All KPIs approved — escrow release triggered!', { duration: 5000 });
      } else {
        toast.success('Review submitted!');
      }
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      queryClient.invalidateQueries({ queryKey: ['job-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
      onClose();
      setRejectReason('');
      setShowReject(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Review Proof Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* KPI details */}
          <div className={`p-4 rounded-xl border space-y-2 ${kpi?.is_primary ? 'border-chart-3/40 bg-chart-3/5' : 'border-border bg-secondary/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {kpi?.is_primary && <Flame className="w-4 h-4 text-chart-3" />}
                <span className="font-bold text-foreground text-sm">{kpi?.name}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">{kpi?.weight}%</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Target: <span className="text-foreground font-medium">{kpi?.target_value}</span></span>
              </div>
            </div>
          </div>

          {/* Achieved metric */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <BarChart3 className="w-3.5 h-3.5" /> Achieved
            </div>
            <p className="text-sm font-semibold text-foreground">{proof?.metric_achieved}</p>
          </div>

          {/* Proof link */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1.5">Proof Link</p>
            <a
              href={proof?.proof_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              {proof?.proof_link}
            </a>
          </div>

          {/* Score impact */}
          {!showReject && scoreGainIfApproved > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <TrendingUp className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs text-accent">
                Approving increases the talent's score by{' '}
                <span className="font-bold">+{scoreGainIfApproved.toFixed(1)}%</span>
                {' '}({currentScore.toFixed(1)}% → {newScore.toFixed(1)}%)
              </p>
            </div>
          )}

          {/* Last KPI warning — escrow release notice */}
          {!showReject && isLastKpi && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/25">
              <Coins className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-primary space-y-0.5">
                <p className="font-semibold">This is the final KPI</p>
                <p className="text-primary/80">
                  Approving this will mark the job complete and trigger the escrow release —{' '}
                  <span className="font-medium">${job?.payment_amount} USDC</span> will be sent to the talent's wallet.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          {!showReject ? (
            <div className="flex gap-3 pt-1">
              <Button
                onClick={() => reviewMutation.mutate({ approved: true })}
                disabled={reviewMutation.isPending}
                className="flex-1 bg-accent text-accent-foreground gap-2"
              >
                {reviewMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReject(true)}
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick reasons:</p>
                {QUICK_REJECT_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                      rejectReason === reason
                        ? 'border-destructive/60 bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground hover:border-destructive/30 hover:text-foreground'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Or write a custom reason (required)…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-secondary/50 border-border min-h-[70px] text-sm"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowReject(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => reviewMutation.mutate({ approved: false })}
                  disabled={!rejectReason.trim() || reviewMutation.isPending}
                  className="flex-1 bg-destructive text-destructive-foreground gap-2"
                >
                  {reviewMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />
                  }
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Your decision is recorded and visible to the talent.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
