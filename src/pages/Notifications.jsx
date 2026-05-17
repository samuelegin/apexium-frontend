import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCircle2, XCircle, Send,
  UserCheck, Briefcase, Check, Users,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Notification } from '@/api/entities';

const typeIcons = {
  job_accepted:         Briefcase,
  proof_submitted:      Send,
  proof_approved:       CheckCircle2,
  proof_rejected:       XCircle,
  application_received: UserCheck,
  selected_for_job:     CheckCircle2,
  pod_invite:           Users,
};

const typeColors = {
  job_accepted:         'text-primary bg-primary/10',
  proof_submitted:      'text-amber-600 bg-amber-100 dark:bg-amber-950/40',
  proof_approved:       'text-primary bg-primary/10',
  proof_rejected:       'text-destructive bg-destructive/10',
  application_received: 'text-primary bg-primary/10',
  selected_for_job:     'text-primary bg-primary/10',
  pod_invite:           'text-primary bg-primary/10',
};

export default function Notifications() {
  const { user }       = useAuth();
  const queryClient    = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => Notification.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => { await Notification.update(id, { is_read: true }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const Icon  = typeIcons[notif.type] || Bell;
            const color = typeColors[notif.type] || 'text-muted-foreground bg-secondary';
            return (
              <button
                key={notif.id}
                onClick={() => { if (!notif.is_read) markReadMutation.mutate(notif.id); }}
                className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                  notif.is_read
                    ? 'border-border bg-card opacity-60'
                    : 'border-border bg-card hover:border-primary/20 hover:bg-secondary/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  notif.is_read ? 'bg-secondary text-muted-foreground' : color
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {notif.created_date ? format(new Date(notif.created_date), 'MMM d, h:mm a') : ''}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
