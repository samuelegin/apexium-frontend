import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Check, X, Wallet } from 'lucide-react';

/**
 * TxProgressModal — shows a live checklist of on-chain steps.
 *
 * Props:
 *   open        — boolean
 *   title       — modal heading, e.g. "Fund escrow"
 *   subtitle    — optional one-line description
 *   steps       — [{ key, label }] in order, e.g.
 *                 [{ key: 'approve', label: 'Approve USDC' }, { key: 'fund', label: 'Fund escrow' }]
 *   status      — { [key]: 'idle' | 'pending' | 'confirming' | 'done' | 'error' }
 *   error       — error message string, shown if any step is 'error'
 *   onClose     — called when the modal can be dismissed (only offered on done/error)
 */
export default function TxProgressModal({ open, title, subtitle, steps, status = {}, error, onClose }) {
  const anyError  = Object.values(status).includes('error') || !!error;
  const allDone   = steps.length > 0 && steps.every(s => status[s.key] === 'done');
  const dismissable = anyError || allDone;

  const stepState = (key) => status[key] ?? 'idle';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && dismissable) onClose?.(); }}>
      <DialogContent
        className="bg-card border-border max-w-sm"
        onInteractOutside={(e) => { if (!dismissable) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!dismissable) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>

        {subtitle && <p className="text-xs text-muted-foreground -mt-2">{subtitle}</p>}

        <div className="space-y-2 mt-2">
          {steps.map((step, i) => {
            const s = stepState(step.key);
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  s === 'error'   ? 'border-destructive/30 bg-destructive/5' :
                  s === 'done'    ? 'border-primary/20 bg-primary/5' :
                  s === 'idle'    ? 'border-border bg-secondary/20 opacity-60' :
                                    'border-primary/30 bg-primary/5'
                }`}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold
                  ${s === 'done' ? 'bg-primary text-primary-foreground' : ''}">
                  {s === 'done' && <Check className="w-3.5 h-3.5 text-primary" />}
                  {s === 'error' && <X className="w-3.5 h-3.5 text-destructive" />}
                  {(s === 'pending' || s === 'confirming') && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                  {s === 'idle' && <span className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px] text-muted-foreground">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s === 'idle' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s === 'pending'    && 'Waiting for wallet confirmation…'}
                    {s === 'confirming' && 'Confirming on-chain…'}
                    {s === 'done'       && 'Confirmed'}
                    {s === 'error'      && 'Failed'}
                    {s === 'idle'       && 'Not started'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {anyError && (
          <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            {error || 'Something went wrong. Check your wallet and try again.'}
          </div>
        )}

        {dismissable && (
          <button
            onClick={onClose}
            className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mt-1"
          >
            {allDone ? 'Done' : 'Close'}
          </button>
        )}

        {!dismissable && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Keep this window open — check your wallet for pending requests.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
