import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useMode } from '@/lib/ModeContext';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Rocket, Loader2,
  Wallet, ShieldCheck, Info, Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import KPIBuilder from '@/components/postjob/KPIBuilder';
import { Job, KPI } from '@/api/entities';
import { TARGET_CHAIN, isTestnet } from '@/lib/wagmi';
import { v4 as uuidv4 } from 'uuid';

const CATEGORIES = [
  { value: 'marketing',   label: 'Marketing' },
  { value: 'development', label: 'Development' },
  { value: 'design',      label: 'Design' },
  { value: 'content',     label: 'Content' },
  { value: 'sales',       label: 'Sales' },
  { value: 'community',   label: 'Community' },
  { value: 'analytics',   label: 'Analytics' },
  { value: 'operations',  label: 'Operations' },
  { value: 'other',       label: 'Other' },
];

const STEPS = ['Details', 'KPIs', 'Deadline', 'Payment'];

/* ── Step indicator ─────────────────────────────────────────────────────────── */
function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const step   = i + 1;
        const done   = current > step;
        const active = current === step;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                done   ? 'bg-primary text-primary-foreground' :
                active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                         'bg-secondary text-muted-foreground'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              <span className={`text-xs font-medium hidden sm:inline transition-colors ${
                active ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Field wrapper ──────────────────────────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function PostJob() {
  const { user }       = useAuth();
  const { isEmployer } = useMode();
  const navigate       = useNavigate();

  const [step,        setStep]        = useState(1);
  const [title,       setTitle]       = useState('');
  const [category,    setCategory]    = useState('');
  const [kpis,        setKpis]        = useState([{ name: '', target_value: '', weight: '', baseline: '' }]);
  const [deadline,    setDeadline]    = useState('');
  const [payment,     setPayment]     = useState('');

  const totalWeight = kpis.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);

  const canNext = () => {
    if (step === 1) return title.trim() && category;
    if (step === 2) return kpis.every(k => k.name && k.target_value && k.weight) && totalWeight === 100;
    if (step === 3) return deadline;
    if (step === 4) return Number(payment) > 0;
    return false;
  };

  useEffect(() => {
    if (!isEmployer) navigate('/', { replace: true });
  }, [isEmployer, navigate]);

  // Posting a job creates a private draft only — nothing is visible in the
  // marketplace and no wallet is touched. The job becomes real (visible,
  // fundable-from-here-on) once the employer funds it from My Jobs, which
  // calls fundJob(jobId, amount) — no recipient needed at that point either,
  // since v4's fundJob() takes just employer+amount. Recipient assignment
  // (setPayout) happens later still, once a talent is actually selected.
  const publishMutation = useMutation({
    mutationFn: async () => {
      const jobUUID = uuidv4(); // becomes the on-chain jobId once funded later

      const maxWeight  = Math.max(...kpis.map(k => Number(k.weight)));
      // .slice() first — .sort() mutates in place, and kpis is the component's
      // live state array, so sorting it directly here silently reorders the
      // KPI list on screen as a side effect of computing a summary string.
      const kpiSummary = [...kpis]
        .sort((a, b) => Number(b.weight) - Number(a.weight))
        .slice(0, 2)
        .map(k => `${k.name} (${k.weight}%)`)
        .join(', ');

      const job = await Job.create({
        id:                jobUUID,
        title,
        category,
        employer_email:    user.email,
        employer_username: user.username || user.full_name,
        deadline,
        payment_amount:    Number(payment),
        status:            'draft',
        applicant_count:   0,
        kpi_summary:       kpiSummary,
        escrow_funded:     false,
      });

      // Job creation and KPI creation are two separate requests, so a failure
      // in the second one used to leave an orphaned draft behind — a job row
      // with zero KPIs, and no automatic way to clean it up. That's what was
      // producing the stuck/duplicate drafts: each failed attempt left a dead
      // job, and the only way forward was to try posting again. Now, if the
      // KPI bulk-create fails, we delete the just-created job so the attempt
      // fails cleanly and atomically from the user's point of view — nothing
      // is left behind to retry around.
      try {
        await KPI.bulkCreate(
          kpis.map(k => ({
            job_id:             job.id,
            name:               k.name,
            target_value:       k.target_value,
            weight:             Number(k.weight),
            baseline:           k.baseline || '',
            is_primary:         Number(k.weight) === maxWeight,
            status:             'not_started',
            completion_percent: 0,
          }))
        );
      } catch (err) {
        await Job.delete(job.id).catch(() => {});
        throw err;
      }

      return job;
    },
    onSuccess: () => {
      toast.success('Draft saved — fund it from My Jobs to publish it to the marketplace');
      navigate('/my-jobs');
    },
    onError: (err) => {
      const msg = err.message ?? 'Failed to publish job';
      toast.error(msg);
    },
  });

  if (!isEmployer) return null;

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Post a Job</h1>
          <p className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="bg-card rounded-2xl border border-border p-6">

        {/* Step 1 — Details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Job details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Give your job a clear title and category so the right talents can find it.
              </p>
            </div>
            <Field label="Job title">
              <Input
                placeholder="e.g. Social Media Growth Campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background border-border mt-1"
              />
            </Field>
            <Field label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background border-border mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {/* Step 2 — KPIs */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Define KPIs</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set clear, measurable outcomes. Talents are paid based on achieving these.
              </p>
            </div>
            <KPIBuilder kpis={kpis} setKpis={setKpis} category={category} />
          </div>
        )}

        {/* Step 3 — Deadline */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Set a deadline</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose a realistic deadline — talents see this before they apply.
              </p>
            </div>
            <Field label="Deadline">
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-background border-border mt-1"
                min={new Date().toISOString().split('T')[0]}
              />
            </Field>
          </div>
        )}

        {/* Step 4 — Payment */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Payment & escrow</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set the budget now — you'll lock it into escrow once you select a talent.
              </p>
            </div>

            <Field label="Payment amount (USDC)">
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                <Input
                  type="number"
                  min="1"
                  placeholder="500"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  className="bg-background border-border pl-7"
                />
              </div>
            </Field>

            {/* Escrow info card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">Escrow-protected payment</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground pl-6 list-disc">
                <li>This creates a private draft — no wallet action needed yet, and nobody can see it</li>
                <li>Go to <span className="font-medium text-foreground">My Jobs</span> and click <span className="font-medium text-foreground">Fund Job</span> to lock the budget in the <span className="font-medium text-foreground">work3labs Escrow</span> contract on Base — that's what makes it visible in the marketplace</li>
                <li>Picking a talent later locks in who gets paid — separately, after funding</li>
                <li>Funds are only released once all KPIs are approved and you confirm completion</li>
              </ul>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-primary/10">
                <Wallet className="w-3.5 h-3.5" />
                <span>
                  Network: <span className="text-foreground font-medium">{TARGET_CHAIN.name}</span>
                </span>
                {isTestnet && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                    TESTNET
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                This saves a private draft — your wallet isn't involved until you fund it from My Jobs.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => publishMutation.mutate()}
            disabled={!canNext() || publishMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {publishMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Rocket className="w-4 h-4" /> Save Draft</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
