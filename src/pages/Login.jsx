import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMode } from '@/lib/ModeContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import auth from '@/api/authApi';
import GoogleAuthButton from '@/components/GoogleAuthButton';

function PublicLogo({ size = 40, className = '' }) {
  return (
    <img
      src="/logo.jpg"
      alt="Work3Labs logo"
      width={size}
      height={size}
      className={`rounded-2xl object-cover ${className}`}
    />
  );
}

export default function Login() {
  const { user, refetch, updateProfile } = useAuth();
  const { switchMode } = useMode();
  const navigate = useNavigate();

  const [roleSelectionOpen, setRoleSelectionOpen] = useState(false);
  const [selectedRole, setSelectedRole]           = useState('jobber');
  const [cvFile, setCvFile]                       = useState(null);
  const [cvUrl, setCvUrl]                         = useState('');
  const [cvUploading, setCvUploading]             = useState(false);
  const [cvError, setCvError]                     = useState('');

  /* Open role dialog if user logged in but hasn't confirmed mode */
  useEffect(() => {
    if (!user) return;
    const confirmed =
      user.mode_confirmed === 1 ||
      user.mode_confirmed === '1' ||
      user.mode_confirmed === true;
    if (!confirmed && !roleSelectionOpen) {
      setSelectedRole(user?.selected_mode || 'jobber');
      setCvUrl(user?.cv_url || '');
      setRoleSelectionOpen(true);
    }
  }, [user, roleSelectionOpen]);

  /* CV upload */
  const handleCvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCvError('');
    setCvFile(file);
    setCvUploading(true);
    try {
      const data = await auth.uploadFile(file);
      if (!data?.file_url) throw new Error('Upload failed.');
      setCvUrl(data.file_url);
      toast.success('CV uploaded successfully.');
    } catch (error) {
      setCvError(error?.message || 'CV upload failed.');
      setCvFile(null);
      setCvUrl('');
    } finally {
      setCvUploading(false);
    }
  };

  /* Confirm role selection */
  const handleRoleConfirm = async () => {
    try {
      switchMode(selectedRole);
      await updateProfile({
        selected_mode: selectedRole,
        mode_confirmed: 1,
        ...(selectedRole === 'jobber' && cvUrl ? { cv_url: cvUrl } : {}),
      });
    } catch (error) {
      toast.error(error?.message || 'Unable to save selection.');
      return;
    }
    setRoleSelectionOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <>
      {/* ── Login page ─────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-background flex">

        {/* Left panel — brand */}
        <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#0d0d0d] p-12">
          <div className="flex items-center gap-3">
            <PublicLogo size={36} />
          </div>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#39FF6A]/30 bg-[#39FF6A]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39FF6A]" />
              <span className="text-[#39FF6A] text-xs font-medium">Base Sepolia Testnet</span>
            </div>
            <h1 className="text-white text-3xl font-semibold leading-snug">
              KPI-driven work,<br />on-chain accountability.
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Post jobs, submit proof, get paid — all verified on Base.
            </p>
          </div>

          <p className="text-white/20 text-xs">© {new Date().getFullYear()} work3labs</p>
        </div>

        {/* Right panel — sign in */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-8">

            {/* Mobile logo */}
            <div className="flex lg:hidden flex-col items-center gap-3">
              <PublicLogo size={44} />
              <span className="text-xl font-semibold tracking-tight text-foreground">work3labs</span>
            </div>

            {/* Heading */}
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
            </div>

            {/* Google button */}
            <div className="space-y-3">
              <GoogleAuthButton label="Continue with Google" />
              <p className="text-center text-xs text-muted-foreground">
                By signing in you agree to our terms of service.
              </p>
            </div>

            {/* Divider with features */}
            <div className="border-t border-border pt-6 space-y-3">
              {[
                'Connect your wallet to receive on-chain payments',
                'KPI-based milestone tracking for every job',
                'Build your PI score with completed work',
              ].map((text) => (
                <div key={text} className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── Role selection dialog (unchanged logic) ─────────────────────────── */}
      <Dialog open={roleSelectionOpen} onOpenChange={setRoleSelectionOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Choose your mode</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select how you want to use work3labs. You can switch modes anytime from the sidebar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: 'jobber',
                  title: 'Talent',
                  description: 'Apply for work, submit proof, earn on-chain.',
                },
                {
                  key: 'employer',
                  title: 'Project',
                  description: 'Post jobs, set KPIs, review applicants.',
                },
              ].map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedRole(option.key)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selectedRole === option.key
                      ? 'border-primary bg-primary/8 shadow-sm'
                      : 'border-border bg-secondary/40 hover:border-primary/40'
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground mb-1.5">
                    {option.title}
                    {selectedRole === option.key && (
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
                </button>
              ))}
            </div>

            {selectedRole === 'jobber' && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  Upload your CV <span className="text-muted-foreground font-normal">(optional)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Attached to your applications so employers can review your background.
                </p>
                <input
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={handleCvUpload}
                  disabled={cvUploading}
                  className="block w-full text-xs text-muted-foreground
                    file:mr-3 file:rounded-lg file:border-0
                    file:bg-primary file:px-3 file:py-1.5
                    file:text-xs file:font-semibold file:text-primary-foreground
                    hover:file:bg-primary/90 file:cursor-pointer"
                />
                {cvUploading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                  </div>
                )}
                {cvFile && !cvUploading && (
                  <p className="text-xs text-foreground">
                    <span className="text-primary">✓</span> {cvFile.name}
                  </p>
                )}
                {cvError && <p className="text-xs text-destructive">{cvError}</p>}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              onClick={handleRoleConfirm}
              disabled={cvUploading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {cvUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</>
              ) : (
                `Continue as ${selectedRole === 'jobber' ? 'Talent' : 'Project'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
