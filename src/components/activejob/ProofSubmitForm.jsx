import React, { useState, useRef, useEffect } from 'react';

import { useAuth } from '@/lib/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link2, BarChart3, Loader2, Send, Shield, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import auth from '@/api/authApi';
import { Job, KPI, Notification, ProofSubmission } from '@/api/entities';

const isValidUrl = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
};

export default function ProofSubmitForm({ kpi, jobId, existingProofs, open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [proofLink, setProofLink] = useState('');
  const [metricAchieved, setMetricAchieved] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const lastSubmitAttempt = useRef(null);

  useEffect(() => {
    if (!open) {
      setProofLink('');
      setMetricAchieved('');
      setProofFile(null);
      setUploadedUrl('');
      setIsUploading(false);
      setFileError('');
      setSuspiciousCount(0);
    }
  }, [open]);

  const alreadySubmitted = existingProofs.some(p => p.kpi_id === kpi.id);
  const isDuplicateLink = proofLink.trim() !== '' && existingProofs.some(p => p.proof_link === proofLink.trim());

  const urlValid = isValidUrl(proofLink);
  const metricFilled = metricAchieved.trim().length > 0;
  const canSubmit = (urlValid || uploadedUrl) && !isDuplicateLink && metricFilled && !alreadySubmitted;

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError('');
    setProofFile(file);
    setIsUploading(true);

    try {
      const data = await auth.uploadFile(file);
      if (!data?.file_url) throw new Error('Upload did not return a file URL.');
      setUploadedUrl(data.file_url);
      setProofLink(data.file_url);
      toast.success('File uploaded successfully.');
    } catch (error) {
      setFileError(error?.message || 'File upload failed.');
      setProofFile(null);
      setUploadedUrl('');
      setProofLink('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setUploadedUrl('');
    setProofLink('');
    setFileError('');
  };

  const handleSuspiciousAttempt = () => {
    const now = Date.now();
    if (lastSubmitAttempt.current && now - lastSubmitAttempt.current < 3000) {
      setSuspiciousCount(c => c + 1);
    }
    lastSubmitAttempt.current = now;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      await ProofSubmission.create({
        job_id: jobId,
        kpi_id: kpi.id,
        submitter_email: user.email,
        proof_link: proofLink.trim(),
        metric_achieved: metricAchieved.trim(),
        status: 'pending',
      });
      await KPI.update(kpi.id, { status: 'submitted' });

      const jobs = await Job.filter({ id: jobId });
      const job = jobs[0];
      if (job) {
        await Notification.create({
          user_email: job.employer_email,
          type: 'proof_submitted',
          title: 'Proof Submitted',
          message: `Proof submitted for KPI "${kpi.name}" on "${job.title}"`,
          job_id: jobId,
        });
      }
    },
    onSuccess: () => {
      toast.success('Proof submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      queryClient.invalidateQueries({ queryKey: ['job-kpis'] });
      onClose();
      setProofLink('');
      setMetricAchieved('');
      setProofFile(null);
      setUploadedUrl('');
      setFileError('');
    },
  });

  const handleSubmitClick = () => {
    handleSuspiciousAttempt();
    if (canSubmit) {
      submitMutation.mutate();
    }
  };

  if (alreadySubmitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" /> Proof Already Submitted
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {kpi.name} — Target: {kpi.target_value}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span>This proof has been recorded and cannot be edited. Await employer review.</span>
          </div>
          <Button variant="outline" onClick={onClose} className="w-full mt-2">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Submit Proof
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {kpi.name} — Target: <span className="font-medium text-foreground">{kpi.target_value}</span>
            <span className="ml-2 text-xs">({kpi.weight}% weight)</span>
          </DialogDescription>
        </DialogHeader>

        {/* Suspicious activity warning */}
        {suspiciousCount >= 2 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Unusual activity detected. Please ensure submissions are valid.
          </div>
        )}

        <div className="space-y-4 mt-1">
          {/* Proof Link or File */}
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1.5">
              <Link2 className="w-3.5 h-3.5" /> Proof Link or File <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-2">
              <Input
                placeholder="https://..."
                value={proofLink}
                onChange={(e) => {
                  setProofLink(e.target.value);
                  if (uploadedUrl) {
                    setUploadedUrl('');
                    setProofFile(null);
                  }
                }}
                className="bg-secondary/50 border-border"
              />
              <input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full text-xs text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            {proofFile && (
              <div className="mt-2 text-xs text-foreground">
                Uploaded file: <span className="font-medium">{proofFile.name}</span>
                <button type="button" className="ml-2 text-primary underline" onClick={handleRemoveFile}>
                  Remove
                </button>
              </div>
            )}
            {isUploading && (
              <p className="text-xs text-muted-foreground mt-1">Uploading file…</p>
            )}
            {fileError && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {fileError}
              </p>
            )}
            {proofLink && !urlValid && !uploadedUrl && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Link must start with http:// or https://
              </p>
            )}
            {isDuplicateLink && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Duplicate proof link detected. Each KPI requires a unique submission.
              </p>
            )}
          </div>

          {/* Metric */}
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Metric Achieved <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. 12 posts, 800 impressions"
              value={metricAchieved}
              onChange={(e) => setMetricAchieved(e.target.value)}
              className="bg-secondary/50 border-border"
            />
            {!metricFilled && metricAchieved !== '' && (
              <p className="text-xs text-destructive mt-1">Please describe what metric you achieved.</p>
            )}
          </div>

          {/* Helper hint */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
            <span>Submit verifiable results with a link or file upload (images, docs, videos). Once submitted, proof cannot be edited.</span>
          </div>

          {!canSubmit && proofLink && metricAchieved && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {!urlValid ? 'Invalid link format. Use a full URL starting with https://' : isDuplicateLink ? 'This link was already used for another KPI.' : 'All fields must be completed.'}
            </p>
          )}

          <Button
            onClick={handleSubmitClick}
            disabled={!canSubmit || submitMutation.isPending}
            className="w-full bg-primary text-primary-foreground gap-2 transition-all active:scale-95"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitMutation.isPending ? 'Submitting...' : 'Submit Proof'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}