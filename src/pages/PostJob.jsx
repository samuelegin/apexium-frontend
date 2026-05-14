import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useMode } from '@/lib/ModeContext';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Rocket, Loader2, Wallet, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import StepIndicator from '@/components/postjob/StepIndicator';
import KPIBuilder from '@/components/postjob/KPIBuilder';
import { Job, KPI } from '@/api/entities';
import { useEscrow } from '@/hooks/useEscrow';
import WalletButton from '@/components/wallet/WalletButton';

const categories = [
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

export default function PostJob() {
  const { user }       = useAuth();
  const { isEmployer } = useMode();
  const navigate       = useNavigate();
  const escrow         = useEscrow();

  const [step,     setStep]     = useState(1);
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('');
  const [kpis,     setKpis]     = useState([{ name: '', target_value: '', weight: '', baseline: '' }]);
  const [deadline, setDeadline] = useState('');
  const [payment,  setPayment]  = useState('');

  // jobber wallet is collected after a jobber accepts — placeholder stored
  // with the job record so the backend relayer knows where to send USDC.
  const [jobberWallet, setJobberWallet] = useState('');

  const totalWeight = kpis.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);

  const canNext = () => {
    if (step === 1) return title.trim() && category;
    if (step === 2) return kpis.every(k => k.name && k.target_value && k.weight) && totalWeight === 100;
    if (step === 3) return deadline;
    if (step === 4) return Number(payment) > 0;
    return false;
  };

  // ─── Step 1: create job record + fund escrow ──────────────────────────────
  const publishMutation = useMutation({
    mutationFn: async () => {
      const maxWeight  = Math.max(...kpis.map(k => Number(k.weight)));
      const kpiSummary = kpis
        .sort((a, b) => Number(b.weight) - Number(a.weight))
        .slice(0, 2)
        .map(k => `${k.name} (${k.weight}%)`)
        .join(', ');

      // 1. Create job record in DB
      const job = await Job.create({
        title,
        category,
        employer_email:    user.email,
        employer_username: user.username || user.full_name,
        deadline,
        payment_amount:    Number(payment),
        status:            'open',
        applicant_count:   0,
        kpi_summary:       kpiSummary,
        escrow_funded:     false,   // backend updates this after on-chain confirmation
      });

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

      // 2. Fund escrow on-chain
      // jobberWallet is optional at post time (filled once a jobber is selected).
      // We use address(0) as placeholder — real address is set when job is accepted.
      // The backend relayer will only call release() after verifying the real jobber.
      const escrowJobberAddr = jobberWallet.trim() || '0x0000000000000000000000000000000000000000';

      const result = await escrow.fundJob(job.id, escrowJobberAddr, Number(payment));

      if (!result.success) {
        // Job was created in DB — mark it, but warn user escrow failed
        await Job.update(job.id, { escrow_error: result.error });
        toast.warning('Job created but escrow deposit failed. You can retry from the job page.', { duration: 6000 });
      } else {
        await Job.update(job.id, { escrow_tx_hash: result.txHash, escrow_funded: true });
      }

      return job;
    },
    onSuccess: (job) => {
      toast.success('Job published and escrow funded!');
      navigate(`/job/${job.id}`);
    },
    onError: (err) => {
      toast.error(err.message ?? 'Failed to publish job');
    },
  });

  useEffect(() => {
    if (!isEmployer) navigate('/', { replace: true });
  }, [isEmployer, navigate]);

  if (!isEmployer) return null;

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Post KPI Job</h1>
      </div>

      <StepIndicator current={step} />

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <Label>Job Title</Label>
            <Input
              placeholder="e.g. Social Media Growth Campaign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-card border-border mt-2"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-card border-border mt-2">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 2: KPIs */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Define KPIs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Define clear, measurable outcomes. Jobbers are paid based on achieving these.</p>
          </div>
          <KPIBuilder kpis={kpis} setKpis={setKpis} category={category} />
        </div>
      )}

      {/* Step 3: Deadline */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Set Deadline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose a realistic deadline — jobbers see this before applying.</p>
          </div>
          <div>
            <Label>Deadline</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-card border-border mt-2"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      )}

      {/* Step 4: Payment + Escrow */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Payment & Escrow</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Funds are held in a smart contract on Base and released to the jobber only when all KPIs are approved.
            </p>
          </div>

          <div>
            <Label>Payment Amount (USDC)</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">$</span>
              <Input
                type="number"
                min="1"
                placeholder="500"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="bg-card border-border pl-8"
              />
            </div>
          </div>

          {/* Escrow info card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">Escrow-protected payment</span>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground pl-6 list-disc">
              <li>Your USDC is locked in the <span className="text-foreground font-medium">ApexEscrow</span> contract on Base</li>
              <li>Funds are only released when <span className="text-foreground font-medium">all KPIs are approved</span></li>
              <li>You can cancel and reclaim funds before a jobber is selected</li>
            </ul>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-primary/10">
              <Wallet className="w-3.5 h-3.5" />
              <span>Network: <span className="text-foreground">{escrow.networkName}</span></span>
              {escrow.isTestnet && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 font-medium">TESTNET</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>You'll need to approve the USDC spend in your wallet and confirm two transactions (approve + deposit).</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-primary text-primary-foreground gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          !escrow.isConnected ? (
            <div className="flex flex-col items-end gap-1">
              <WalletButton />
              <span className="text-[11px] text-muted-foreground">Connect wallet to publish</span>
            </div>
          ) : (
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={!canNext() || publishMutation.isPending}
              className="bg-accent text-accent-foreground gap-2"
            >
              {publishMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Rocket className="w-4 h-4" />
              }
              {publishMutation.isPending ? 'Awaiting wallet…' : 'Publish & Fund Escrow'}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
