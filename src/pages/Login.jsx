import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMode } from '@/lib/ModeContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import auth from '@/api/authApi';
import api from '@/api/apiClient';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import TelegramAuthButton from '@/components/TelegramAuthButton';

// ── Tabs: login | register | forgot ───────────────────────────────────────────
export default function Login() {
  const { login, refetch, updateProfile, user } = useAuth();
  const { switchMode } = useMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab,      setTab]      = useState('login');
  const [roleSelectionOpen, setRoleSelectionOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('jobber');
  const [cvFile, setCvFile] = useState(null);
  const [cvUrl, setCvUrl] = useState('');
  const [cvUploading, setCvUploading] = useState(false);
  const [cvError, setCvError] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  // login fields
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');

  // register fields
  const [regEmail,    setRegEmail]    = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName,     setRegName]     = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regReferral, setRegReferral] = useState('');
  const [regErr,      setRegErr]      = useState('');

            {/* Sign in (email login temporarily disabled) */}
            {tab === 'login' && (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">Email/password login is temporarily disabled. Use one of the options below to sign in.</p>
                <GoogleAuthButton />
                <div className="mt-3">
                  <TelegramAuthButton />
                </div>
              </div>
            )}
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegErr('');
    if (!regEmail || !regPassword || !regName || !regUsername) { setRegErr('All fields are required.'); return; }
    if (regPassword.length < 6) { setRegErr('Password must be at least 6 characters.'); return; }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(regUsername.trim())) {
      setRegErr('Username must be 3-30 characters and contain only letters, numbers, or underscores.');
      return;
    }
    setLoading(true);
    try {
      await auth.register(regEmail.trim(), regPassword, regName.trim(), regUsername.trim(), regReferral || undefined);
      setPendingEmail(regEmail.trim());
      setVerificationStep('verify');
      setResendTimer(60); // 60 second cooldown
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
            {/* Create account (email registration temporarily disabled) */}
            {tab === 'register' && (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">Email-based registration is temporarily disabled. Create an account using Google or Telegram.</p>
                <GoogleAuthButton />
                <div className="mt-3">
                  <TelegramAuthButton />
                </div>
              </div>
            )}
    }
    setRoleSelectionOpen(false);
    navigate('/', { replace: true });
  };
  // ── Shared input style ─────────────────────────────────────────────────────
  const inputCls = "bg-card border-border";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-foreground font-bold text-xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Apexium</h1>
          <p className="text-sm text-muted-foreground">KPI-based freelance marketplace</p>
        </div>

        {/* ── Forgot password view ─────────────────────────────────────────── */}
        {tab === 'forgot' && (
          <div className="space-y-4">
            <button onClick={() => { setTab('login'); setForgotSent(false); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>

            {forgotSent ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
                <p className="font-semibold text-foreground">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  If <span className="font-medium text-foreground">{forgotEmail}</span> is registered,
                  you'll receive a reset link shortly.
                </p>
                <Button variant="outline" onClick={() => { setTab('login'); setForgotSent(false); }} className="w-full">
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Reset password</p>
                  <p className="text-xs text-muted-foreground">Enter your email and we'll send a reset link.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)} className={`pl-9 ${inputCls}`} />
                  </div>
                </div>
                <Button type="submit" disabled={forgotLoading || !forgotEmail} className="w-full h-11 gap-2">
                  {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ── Login / Register tabs ────────────────────────────────────────── */}
        {tab !== 'forgot' && (
          <>
            <div className="flex rounded-xl bg-secondary p-1 gap-1">
              {['login', 'register'].map(t => (
                <button key={t} onClick={() => {
                  setTab(t);
                  setLoginErr('');
                  setRegErr('');
                  setVerificationStep('register');
                  setVerificationCode('');
                  setPendingEmail('');
                  setResendTimer(0);
                }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                    tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {t === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {/* Sign in */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={email}
                      onChange={e => { setEmail(e.target.value); setLoginErr(''); }}
                      className={`pl-9 ${inputCls} ${loginErr ? 'border-destructive' : ''}`}
                      autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPass ? 'text' : 'password'} placeholder="Your password" value={password}
                      onChange={e => { setPassword(e.target.value); setLoginErr(''); }}
                      className={`pl-9 pr-10 ${inputCls} ${loginErr ? 'border-destructive' : ''}`}
                      autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Inline error */}
                  {loginErr && (
                    <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-destructive/20 inline-flex items-center justify-center text-[10px]">!</span>
                      {loginErr}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setTab('forgot')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" disabled={loading || !email || !password} className="w-full h-11 gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
                <GoogleAuthButton />
                <div className="mt-3">
                  <TelegramAuthButton />
                </div>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground">
                    <span className="bg-background px-2">or</span>
                  </div>
                </div>
              </form>
            )}

            {/* Create account */}
            {tab === 'register' && (
              <>
                {/* Step 1: Registration Form */}
                {verificationStep === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Your full name" value={regName}
                          onChange={e => { setRegName(e.target.value); setRegErr(''); }}
                          className={`pl-9 ${inputCls}`} autoComplete="name" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Username</Label>
                      <Input placeholder="Choose a username" value={regUsername}
                        onChange={e => { setRegUsername(e.target.value); setRegErr(''); }}
                        className={`${inputCls}`} autoComplete="username" />
                      <p className="text-xs text-muted-foreground">3-30 letters, numbers, or underscores.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Referral code (optional)</Label>
                      <Input placeholder="ABC12345" value={regReferral}
                        onChange={e => { setRegReferral(e.target.value.toUpperCase()); setRegErr(''); }}
                        className={`${inputCls}`} />
                      <p className="text-xs text-muted-foreground">Earn bonus XP when referred by a friend.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" placeholder="you@example.com" value={regEmail}
                          onChange={e => { setRegEmail(e.target.value); setRegErr(''); }}
                          className={`pl-9 ${inputCls} ${regErr ? 'border-destructive' : ''}`}
                          autoComplete="email" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type={showPass ? 'text' : 'password'} placeholder="At least 6 characters" value={regPassword}
                          onChange={e => { setRegPassword(e.target.value); setRegErr(''); }}
                          className={`pl-9 pr-10 ${inputCls}`} autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPass(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {regErr && (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-destructive/20 inline-flex items-center justify-center text-[10px]">!</span>
                        {regErr}
                      </p>
                    )}
                    <Button type="submit" disabled={loading || !regEmail || !regPassword || !regName || !regUsername} className="w-full h-11 gap-2">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Sending verification…' : 'Send verification code'}
                    </Button>
                    <GoogleAuthButton />
                    <div className="mt-3">
                      <TelegramAuthButton />
                    </div>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs text-muted-foreground">
                        <span className="bg-background px-2">or</span>
                      </div>
                    </div>
                  </form>
                )}

                {/* Step 2: Email Verification */}
                {verificationStep === 'verify' && (
                  <form onSubmit={handleVerifyEmail} className="space-y-4">
                    <div className="text-center space-y-2">
                      <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
                      <h3 className="font-semibold text-foreground">Check your email</h3>
                      <p className="text-sm text-muted-foreground">
                        We sent a verification code to <span className="font-medium text-foreground">{pendingEmail}</span>
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Verification code</Label>
                      <Input
                        type="text"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={e => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(value);
                          setRegErr('');
                        }}
                        className={`text-center text-lg tracking-widest ${inputCls} ${regErr ? 'border-destructive' : ''}`}
                        maxLength={6}
                      />
                    </div>
                    {regErr && (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-destructive/20 inline-flex items-center justify-center text-[10px]">!</span>
                        {regErr}
                      </p>
                    )}
                    <Button type="submit" disabled={loading || verificationCode.length !== 6} className="w-full h-11 gap-2">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Verifying…' : 'Verify & create account'}
                    </Button>
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={backToRegister}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ← Change email
                      </button>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendTimer > 0 || loading}
                        className="text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors"
                      >
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => {
                setTab(tab === 'login' ? 'register' : 'login');
                setLoginErr('');
                setRegErr('');
                setVerificationStep('register');
                setVerificationCode('');
                setPendingEmail('');
                setResendTimer(0);
              }}
                className="text-primary hover:underline font-medium">
                {tab === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </>
        )}

      </div>
      <Dialog open={roleSelectionOpen} onOpenChange={setRoleSelectionOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Choose your mode</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select how you want to use Apexium. Employers can post work and review applicants; jobbers can apply and optionally upload a CV for employers to review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'jobber', title: 'Jobber', description: 'Apply for work and upload your CV.', accent: 'bg-accent/5 border-accent/20 text-accent' },
                { key: 'employer', title: 'Employer', description: 'Post jobs and select the best jobbers.', accent: 'bg-primary/5 border-primary/20 text-primary' },
              ].map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedRole(option.key)}
                  className={`rounded-xl border p-4 text-left transition ${selectedRole === option.key ? `${option.accent} border-current shadow-sm` : 'border-border bg-secondary/50 hover:border-primary/60'}`}
                >
                  <div className="text-sm font-semibold text-foreground mb-2">{option.title}</div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>

            {selectedRole === 'jobber' && (
              <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Paperclip className="w-4 h-4" /> Upload your CV
                </div>
                <p className="text-xs text-muted-foreground">This file will be attached to your applications and shown to employers when they review candidates.</p>
                <input
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={handleCvUpload}
                  disabled={cvUploading}
                  className="block w-full text-xs text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
                {cvFile && (
                  <p className="text-xs text-foreground">Selected: <span className="font-medium">{cvFile.name}</span></p>
                )}
                {cvError && (
                  <p className="text-xs text-destructive">{cvError}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={handleRoleConfirm}
              disabled={cvUploading}
              className="w-full bg-primary text-primary-foreground"
            >
              {cvUploading ? 'Saving…' : `Continue as ${selectedRole === 'jobber' ? 'Jobber' : 'Employer'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
