import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useThemeMode } from '@/lib/ThemeContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  User, Camera, Save, Loader2, LogOut,
  AtSign, Zap, AlertTriangle, Paperclip, Moon, Sun,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import PIScoreGauge from '@/components/shared/PIScoreGauge';
import XPBadge, { getProgress, getNextThreshold } from '@/components/growth/XPBadge';
import TelegramProfileConnect from '@/components/TelegramProfileConnect';
import DiscordProfileConnect from '@/components/DiscordProfileConnect';
import auth from '@/api/authApi';
import { Job } from '@/api/entities';

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();

  const [username,  setUsername]  = useState('');
  const [bio,       setBio]       = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cvUrl,     setCvUrl]     = useState('');
  const [xHandle,   setXHandle]   = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username  || '');
      setBio(user.bio            || '');
      setAvatarUrl(user.avatar_url || '');
      setCvUrl(user.cv_url        || '');
      setXHandle(user.x_handle   || '');
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateProfile({
        username:  username.replace('@', ''),
        bio,
        avatar_url: avatarUrl,
        x_handle:   xHandle ? (xHandle.startsWith('@') ? xHandle : `@${xHandle}`) : '',
      });
    },
    onSuccess: () => toast.success('Profile saved!'),
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
      toast.success('Uploading avatar…');
      const res = await auth.uploadFile(file);
      if (!res || !res.file_url) throw new Error('No file_url returned from upload');
      const cachedUrl = `${res.file_url}?t=${Date.now()}`;
      await updateProfile({
        username:  username.replace('@', ''),
        bio,
        avatar_url: cachedUrl,
        x_handle:   xHandle ? (xHandle.startsWith('@') ? xHandle : `@${xHandle}`) : '',
      });
      toast.success('Avatar updated!');
      setAvatarUrl(cachedUrl);
      try { URL.revokeObjectURL(previewUrl); } catch (_) {}
    } catch (err) {
      toast.error(`Failed to upload avatar: ${err.message}`);
    }
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) { toast.error('CV must be less than 5MB'); return; }
      toast.success('Uploading CV…');
      const res = await auth.uploadFile(file);
      if (!res || !res.file_url) throw new Error('No file_url returned from upload');
      const cachedUrl = `${res.file_url}?t=${Date.now()}`;
      await updateProfile({ cv_url: cachedUrl });
      setCvUrl(cachedUrl);
      toast.success('CV uploaded successfully!');
    } catch (err) {
      toast.error(`Failed to upload CV: ${err.message}`);
    }
  };

  const isEmployer    = user?.role === 'employer';
  const { data: employerCompletedJobs = [] } = useQuery({
    queryKey: ['employer-completed-jobs', user?.email],
    queryFn: () => Job.filter({ employer_email: user?.email, status: 'completed' }, '-created_date', 1000),
    enabled: !!user?.email,
  });

  const { theme, toggleTheme } = useThemeMode();
  const xp            = user?.xp_total || 0;
  const progress      = getProgress(xp);
  const nextThreshold = getNextThreshold(xp);

  const completedCount = employerCompletedJobs.length || user?.total_jobs_completed || 0;
  const hasPIScore     = Boolean(user?.average_pi_score);
  const performanceStats = isEmployer ? [
    { label: 'Posted jobs completed', value: completedCount },
  ] : [
    { label: 'Jobs completed', value: completedCount },
    { label: 'Avg PI Score',   value: hasPIScore ? `${user.average_pi_score}%` : '—' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/90 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>

      {/* Identity card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

          {/* Avatar */}
          <div className="relative group shrink-0">
            <Avatar key={avatarUrl} className="w-20 h-20">
              <AvatarImage
                src={avatarUrl}
                onError={() => { toast.error('Failed to load avatar'); setAvatarUrl(''); }}
              />
              <AvatarFallback className="bg-secondary text-muted-foreground text-xl">
                {user?.full_name?.[0] || <User className="w-7 h-7" />}
              </AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>

          {/* Name + email */}
          <div className="text-center sm:text-left space-y-0.5 flex-1">
            <p className="text-lg font-semibold text-foreground">{user?.full_name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {username && <p className="text-sm text-primary mt-1">@{username}</p>}
          </div>
        </div>

        {/* CV */}
        <div className="mt-5 pt-5 border-t border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Resume / CV</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cvUrl ? 'Saved to your profile' : 'No CV uploaded yet'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label htmlFor="cv-upload-input" className="cursor-pointer">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                {cvUrl ? 'Replace' : 'Upload'}
              </span>
            </label>
            {cvUrl && (
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline underline-offset-2"
              >
                View
              </a>
            )}
            <input
              id="cv-upload-input"
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleCvUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Edit + Performance */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Current Profile Info - Display Only */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Current Profile</h2>
          
          <div className="space-y-3 text-sm">
            {username && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <AtSign className="w-3.5 h-3.5" /> Username
                </p>
                <p className="text-foreground">@{username}</p>
              </div>
            )}
            
            {bio && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bio</p>
                <p className="text-foreground whitespace-pre-wrap">{bio}</p>
              </div>
            )}
            
            {xHandle && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <span className="font-bold">𝕏</span> X Handle
                </p>
                <p className="text-foreground">{xHandle}</p>
              </div>
            )}

            {!username && !bio && !xHandle && (
              <p className="text-xs text-muted-foreground italic">No profile information saved yet</p>
            )}
          </div>
        </div>

        {/* Edit form */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Edit Profile</h2>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" /> Username
            </Label>
            <Input
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, '_'))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Bio</Label>
            <Textarea
              placeholder="Tell us about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          {/* X handle */}
          <div className={`rounded-xl border p-3 space-y-2 transition-colors ${
            xHandle ? 'border-primary/20 bg-primary/5' : 'border-amber-300/40 bg-amber-50 dark:bg-amber-950/20'
          }`}>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="font-bold text-foreground">𝕏</span> X (Twitter) handle
              </Label>
              {xHandle
                ? <span className="text-[10px] text-primary font-medium px-1.5 py-0.5 bg-primary/10 rounded-full">✓ Linked</span>
                : <span className="text-[10px] text-amber-600 font-medium px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded-full">Required for Pods</span>
              }
            </div>
            <Input
              placeholder="@your_handle"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              className="bg-background border-border h-8 text-sm"
            />
            {!xHandle && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Required to create or join pods.
              </p>
            )}
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saveMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </button>
        </div>

        {/* Performance */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Performance</h2>
          <div className="flex justify-center">
            {!isEmployer && hasPIScore && <PIScoreGauge score={user?.average_pi_score || 0} size="md" />}
          </div>
          <div className="space-y-2.5 pt-1">
            {performanceStats.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* XP card */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">XP & Rank</h2>
        </div>
        <XPBadge xp={xp} size="lg" />
        {nextThreshold ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{xp} XP</span>
              <span>{nextThreshold} XP next level</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-primary">Max rank achieved! 🏆</p>
        )}
      </div>

      {/* Telegram */}
      <div>
        <TelegramProfileConnect
          telegramId={user?.telegram_id}
          telegramUsername={user?.telegram_username}
        />
      </div>

      {/* Discord */}
      <div>
        <DiscordProfileConnect
          discordId={user?.discord_id}
          discordUsername={user?.discord_username}
        />
      </div>

      {/* Sign out */}
      <button
        onClick={() => logout()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
