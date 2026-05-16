import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

import { useMutation } from '@tanstack/react-query';
import { User, Camera, Save, Loader2, LogOut, AtSign, Zap, AlertTriangle, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import PIScoreGauge from '@/components/shared/PIScoreGauge';
import XPBadge, { getProgress, getNextThreshold } from '@/components/growth/XPBadge';
import auth from '@/api/authApi';

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [xHandle, setXHandle] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
      setCvUrl(user.cv_url || '');
      setXHandle(user.x_handle || '');
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateProfile({
        username: username.replace('@', ''),
        bio,
        avatar_url: avatarUrl,
        x_handle: xHandle ? (xHandle.startsWith('@') ? xHandle : `@${xHandle}`) : '',
      });
    },
    onSuccess: () => toast.success('Profile saved!'),
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      // Show a local preview immediately so user sees their selection
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
      toast.success('Uploading avatar...');

      const res = await auth.uploadFile(file);
      console.log('avatar upload response', res);
      if (!res || !res.file_url) throw new Error('No file_url returned from upload');

      // Add cache-busting query parameter to force fresh load
      const cachedUrl = `${res.file_url}?t=${Date.now()}`;

      // Auto-save to backend immediately
      try {
        await updateProfile({
          username: username.replace('@', ''),
          bio,
          avatar_url: cachedUrl,
          x_handle: xHandle ? (xHandle.startsWith('@') ? xHandle : `@${xHandle}`) : '',
        });
        toast.success('Avatar updated!');
      } catch (err) {
        console.error('failed to save profile avatar_url', err);
        toast.error('Uploaded image but failed to save profile');
      }

      // Replace preview with final CDN URL
      setAvatarUrl(cachedUrl);
      // revoke the local preview URL now that we're using the remote URL
      try { URL.revokeObjectURL(previewUrl); } catch (e) {}
    } catch (error) {
      console.error('avatar upload error', error);
      toast.error(`Failed to upload avatar: ${error.message}`);
    }
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('CV must be less than 5MB');
        return;
      }

      toast.success('Uploading CV...');
      const res = await auth.uploadFile(file);
      console.log('cv upload response', res);
      if (!res || !res.file_url) throw new Error('No file_url returned from upload');

      const cachedUrl = `${res.file_url}?t=${Date.now()}`;
      await updateProfile({ cv_url: cachedUrl });
      setCvUrl(cachedUrl);
      toast.success('CV uploaded successfully!');
    } catch (error) {
      console.error('cv upload error', error);
      toast.error(`Failed to upload CV: ${error.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">Profile</h1>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar key={avatarUrl} className="w-24 h-24">
                <AvatarImage
                  src={avatarUrl}
                  onError={() => {
                    toast.error('Failed to load avatar image');
                    setAvatarUrl('');
                  }}
                />
                <AvatarFallback className="bg-secondary text-muted-foreground text-2xl">
                  {user?.full_name?.[0] || <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg font-semibold text-foreground">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {username && <p className="text-sm text-primary mt-1">@{username}</p>}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Card className="border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resume</p>
                  <p className="text-sm text-foreground mt-1">{cvUrl ? 'Saved to your profile' : 'No CV uploaded yet'}</p>
                </div>
                <Paperclip className="w-5 h-5 text-primary" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => document.getElementById('cv-upload-input')?.click()}
                >
                  {cvUrl ? 'Replace CV' : 'Upload CV'}
                </Button>
                {cvUrl && (
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline underline-offset-2"
                  >
                    View CV
                  </a>
                )}
              </div>
              <input
                id="cv-upload-input"
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleCvUpload}
                className="hidden"
              />
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5" /> Username</Label>
              <Input
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, '_'))}
                className="bg-secondary/50 border-border mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Bio</Label>
              <Textarea
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-secondary/50 border-border mt-1.5"
                rows={3}
              />
            </div>
            <div className={`rounded-lg p-3 border transition-all ${xHandle ? 'border-accent/30 bg-accent/5' : 'border-chart-3/40 bg-chart-3/5'}`}>
              <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                <span className="font-bold text-foreground">𝕏</span>
                X (Twitter) Handle
                {xHandle
                  ? <span className="ml-auto text-[10px] text-accent font-medium px-1.5 py-0.5 bg-accent/10 rounded-full">✓ Linked</span>
                  : <span className="ml-auto text-[10px] text-chart-3 font-medium px-1.5 py-0.5 bg-chart-3/10 rounded-full">Required for Pods</span>
                }
              </Label>
              <Input
                placeholder="@your_handle"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                className={`border-0 mt-0 ${xHandle ? 'bg-accent/10' : 'bg-secondary/50'}`}
              />
              {!xHandle && (
                <p className="text-xs text-chart-3 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Required to create or join pods.
                </p>
              )}
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full bg-primary text-primary-foreground gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <PIScoreGauge score={user?.average_pi_score || 0} size="md" />
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jobs completed</span>
                <span className="font-mono text-foreground">{user?.total_jobs_completed || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg PI Score</span>
                <span className="font-mono text-foreground">{user?.average_pi_score || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* XP Card */}
      <Card className="border-accent/20 bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" /> XP & Rank
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <XPBadge xp={user?.xp_total || 0} size="lg" />
          {(() => {
            const xp = user?.xp_total || 0;
            const progress = getProgress(xp);
            const nextThreshold = getNextThreshold(xp);
            return nextThreshold ? (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{xp} XP</span>
                  <span>{nextThreshold} XP next level</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : <p className="text-xs text-accent">Max rank achieved! 🏆</p>;
          })()}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => logout()}
        className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>
  );
}