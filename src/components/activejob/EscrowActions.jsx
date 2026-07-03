import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Job, Escrow as EscrowApi } from '@/api/entities';
import { useEscrow } from '@/hooks/useEscrow';
import TxProgressModal from '@/components/shared/TxProgressModal';

/**
 * EscrowActions — the two on-chain steps left after all KPIs are approved:
 *   1. Employer calls confirmComplete() — unlocks the payout, moves nothing yet.
 *   2. Any payout recipient (or anyone, since claim() is permissionless) calls
 *      claim() — this actually sends USDC to the locked-in recipients/shares.
 *
 * There is no backend relayer — both steps require the person's own wallet
 * signature and their own gas.
 */
export default function EscrowActions({ job, isEmployer, isJobber }) {
  const queryClient = useQueryClient();
  const escrow       = useEscrow();
  const [modalOpen, setModalOpen] = useState(false);
  const [action,    setAction]    = useState(null); // 'complete' | 'claim'
  const [status,    setStatus]    = useState({});
  const [error,     setError]     = useState(null);

  const steps = action === 'complete'
    ? [{ key: 'complete', label: 'Confirm completion on-chain' }]
    : [{ key: 'claim',    label: 'Claim payment' }];

  const runTx = async (kind, fn) => {
    setAction(kind);
    setStatus({});
    setError(null);
    setModalOpen(true);
    const result = await fn((key, s) => {
      if (key === 'error') return;
      setStatus(prev => ({ ...prev, [key]: s }));
    });
    if (!result.success) {
      setError(result.error);
      return result;
    }
    try { await EscrowApi.notify(job.id, result.txHash, kind === 'complete' ? 'complete' : 'claim'); } catch (_) {}
    return result;
  };

  const confirmCompleteMutation = useMutation({
    mutationFn: async () => {
      const result = await runTx('complete', (onStep) => escrow.confirmComplete(job.id, onStep));
      if (!result.success) throw new Error(result.error || 'Failed to confirm completion');
    },
    onSuccess: () => {
      toast.success('Completion confirmed on-chain — payout can now be claimed');
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const result = await runTx('claim', (onStep) => escrow.claim(job.id, onStep));
      if (!result.success) throw new Error(result.error || 'Failed to claim payment');
    },
    onSuccess: () => {
      toast.success('Payment claimed!');
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (job.status !== 'completed') return null; // all KPIs must be approved first

  // Step 1: employer hasn't confirmed completion on-chain yet
  if (isEmployer && job.escrow_status === 'funded') {
    return (
      <>
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            All KPIs are approved — confirm completion on-chain to unlock the payout.
          </div>
          <button
            onClick={() => confirmCompleteMutation.mutate()}
            disabled={confirmCompleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
          >
            {confirmCompleteMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
              : 'Confirm Completion'}
          </button>
        </div>
        <TxProgressModal
          open={modalOpen} title="Confirm completion" steps={steps} status={status} error={error}
          onClose={() => setModalOpen(false)}
        />
      </>
    );
  }

  // Step 2: completion confirmed on-chain, payout can be claimed
  if (job.escrow_status === 'completed' && (isJobber || isEmployer)) {
    return (
      <>
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Coins className="w-4 h-4 text-primary shrink-0" />
            {isJobber
              ? `$${job.payment_amount} USDC is ready to claim.`
              : 'Payout is unlocked — the talent (or anyone) can claim it now.'}
          </div>
          {isJobber && (
            <button
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {claimMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Claiming…</>
                : 'Claim Payment'}
            </button>
          )}
        </div>
        <TxProgressModal
          open={modalOpen} title="Claim payment" steps={steps} status={status} error={error}
          onClose={() => setModalOpen(false)}
        />
      </>
    );
  }

  if (job.escrow_status === 'claimed') {
    return (
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-2 text-sm text-foreground">
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Payment has been claimed. This job is fully settled.
      </div>
    );
  }

  return null;
}
