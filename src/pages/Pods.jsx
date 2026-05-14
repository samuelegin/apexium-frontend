import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Crown, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Loader2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Application, Notification, User } from '@/api/entities';
import { format } from 'date-fns';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:  { label: 'Pending',  class: 'bg-chart-3/20 text-chart-3 border-chart-3/30' },
    accepted: { label: 'Accepted', class: 'bg-accent/20 text-accent border-accent/30' },
    rejected: { label: 'Rejected', class: 'bg-destructive/20 text-destructive border-destructive/30' },
  };
  const s = map[status] || map.pending;
  return <Badge className={`border text-xs ${s.class}`}>{s.label}</Badge>;
}

// ── Pod card (applications you CREATED as admin) ───────────────────────────────
function MyPodCard({ app }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{app.pod_name}</span>
            <Badge className="bg-primary/20 text-primary border-0 text-xs">{app.pod_members?.length || 0} members</Badge>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={app.status} />
            <button onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Applied {app.created_date ? format(new Date(app.created_date), 'MMM d, yyyy') : ''} · You are the admin
        </p>

        {expanded && app.pod_members?.length > 0 && (
          <div className="mt-3 rounded-lg bg-secondary/30 border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Members & Reward Split</p>
            {app.pod_members.map((m, i) => (
              <div key={m.username} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {i === 0 && <Crown className="w-3 h-3 text-primary" />}
                  {i !== 0 && <Users className="w-3 h-3 text-muted-foreground" />}
                  <span className="text-foreground">@{m.username}</span>
                  {i === 0 && <span className="text-xs text-muted-foreground">(Admin)</span>}
                </div>
                <span className="font-mono text-xs text-muted-foreground">{m.share}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Invite card (pods where you were ADDED by someone else) ───────────────────
function PodInviteCard({ notification, onAccept, onDecline, accepting, declining }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{notification.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notification.message}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {notification.created_date ? format(new Date(notification.created_date), 'MMM d, h:mm a') : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onAccept(notification)}
            disabled={accepting || declining}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 h-8 text-xs"
          >
            {accepting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecline(notification)}
            disabled={accepting || declining}
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5 h-8 text-xs"
          >
            {declining ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Pods page ─────────────────────────────────────────────────────────────
export default function Pods() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState(null);
  const [respondingAction, setRespondingAction] = useState(null);

  // Pods I created (admin)
  const { data: myPodApps = [], isLoading: loadingMine } = useQuery({
    queryKey: ['my-pod-applications', user?.email],
    queryFn: () => Application.filter({ applicant_email: user?.email, is_pod: true }),
    enabled: !!user?.email,
  });

  // Pod invites — notifications of type pod_invite that are unread (pending response)
  const { data: podInvites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['pod-invites', user?.email],
    queryFn: async () => {
      const all = await Notification.filter({ user_email: user?.email, type: 'pod_invite' });
      return all;
    },
    enabled: !!user?.email,
  });

  const pendingInvites = podInvites.filter(n => !n.is_read);
  const respondedInvites = podInvites.filter(n => n.is_read);

  const respondMutation = useMutation({
    mutationFn: async ({ notification, action }) => {
      // Mark notification as read regardless
      await Notification.update(notification.id, { is_read: true });

      // Find the application this pod invite relates to
      if (notification.job_id) {
        const apps = await Application.filter({ job_id: notification.job_id, is_pod: true });
        // Find the pod application that includes this user as a member
        const podApp = apps.find(a =>
          a.pod_members?.some(m => m.username === user.username)
        );

        if (podApp) {
          if (action === 'decline') {
            // Remove this user from pod_members
            const updatedMembers = podApp.pod_members.filter(m => m.username !== user.username);
            await Application.update(podApp.id, { pod_members: updatedMembers });

            // Notify the pod admin
            const adminUsers = await User.filter({ username: podApp.pod_members[0]?.username });
            if (adminUsers.length > 0) {
              await Notification.create({
                user_email: adminUsers[0].email,
                type: 'pod_invite',
                title: 'Pod member declined',
                message: `@${user.username} declined to join your pod "${podApp.pod_name}" for job application.`,
                job_id: notification.job_id,
              });
            }
          } else {
            // action === 'accept' — notify pod admin
            const adminUsers = await User.filter({ username: podApp.pod_members[0]?.username });
            if (adminUsers.length > 0) {
              await Notification.create({
                user_email: adminUsers[0].email,
                type: 'pod_invite',
                title: 'Pod member accepted!',
                message: `@${user.username} accepted your pod invite for "${podApp.pod_name}".`,
                job_id: notification.job_id,
              });
            }
          }
        }
      }
      return action;
    },
    onSuccess: (action) => {
      toast.success(action === 'accept' ? 'You joined the pod!' : 'Pod invite declined.');
      queryClient.invalidateQueries({ queryKey: ['pod-invites'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      setRespondingId(null);
      setRespondingAction(null);
    },
    onError: () => {
      toast.error('Something went wrong. Try again.');
      setRespondingId(null);
      setRespondingAction(null);
    },
  });

  const handleAccept = (notification) => {
    setRespondingId(notification.id);
    setRespondingAction('accept');
    respondMutation.mutate({ notification, action: 'accept' });
  };

  const handleDecline = (notification) => {
    setRespondingId(notification.id);
    setRespondingAction('decline');
    respondMutation.mutate({ notification, action: 'decline' });
  };

  const isLoading = loadingMine || loadingInvites;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pods</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Team applications and collaborations.</p>
      </div>

      {/* How to create a pod */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Plus className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Create a Pod</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse the <a href="/marketplace" className="text-primary hover:underline">Marketplace</a>, open a job, and choose "Apply as Pod". Members get notified and can accept or decline.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={pendingInvites.length > 0 ? 'invites' : 'mine'}>
        <TabsList className="w-full">
          <TabsTrigger value="mine" className="flex-1">
            My Pods
            {myPodApps.length > 0 && (
              <Badge className="ml-2 bg-primary/20 text-primary border-0 text-xs">{myPodApps.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex-1">
            Invites
            {pendingInvites.length > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground text-xs">{pendingInvites.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Pod Applications */}
        <TabsContent value="mine" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : myPodApps.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="p-10 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No pod applications yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Apply to a job as a Pod to see it here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myPodApps.map(app => <MyPodCard key={app.id} app={app} />)}
            </div>
          )}
        </TabsContent>

        {/* Pod Invites */}
        <TabsContent value="invites" className="mt-4 space-y-4">
          {/* Pending */}
          {pendingInvites.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Awaiting your response
              </h3>
              <div className="space-y-3">
                {pendingInvites.map(n => (
                  <PodInviteCard
                    key={n.id}
                    notification={n}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    accepting={respondingId === n.id && respondingAction === 'accept' && respondMutation.isPending}
                    declining={respondingId === n.id && respondingAction === 'decline' && respondMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Already responded */}
          {respondedInvites.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Past invites
              </h3>
              <div className="space-y-2">
                {respondedInvites.map(n => (
                  <Card key={n.id} className="border-border bg-card opacity-60">
                    <CardContent className="p-3 flex items-start gap-3">
                      <Bell className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pendingInvites.length === 0 && respondedInvites.length === 0 && (
            <Card className="border-border border-dashed">
              <CardContent className="p-10 text-center">
                <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No pod invites yet.</p>
                <p className="text-xs text-muted-foreground mt-1">When someone adds you to their pod, it'll appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
