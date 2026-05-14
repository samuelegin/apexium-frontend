import React from 'react';
import { useAuth } from '@/lib/AuthContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, XCircle, Send, UserCheck, Briefcase, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Notification } from '@/api/entities';

const typeIcons = {
  job_accepted: Briefcase,
  proof_submitted: Send,
  proof_approved: CheckCircle2,
  proof_rejected: XCircle,
  application_received: UserCheck,
  selected_for_job: CheckCircle2,
  pod_invite: Users,
};

const typeColors = {
  job_accepted: 'text-primary',
  proof_submitted: 'text-chart-3',
  proof_approved: 'text-accent',
  proof_rejected: 'text-destructive',
  application_received: 'text-primary',
  selected_for_job: 'text-accent',
  pod_invite: 'text-primary',
};

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => Notification.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await Notification.update(id, { is_read: true });
    },
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} className="gap-2 text-xs">
            <Check className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const Icon = typeIcons[notif.type] || Bell;
            const color = typeColors[notif.type] || 'text-muted-foreground';
            return (
              <Card
                key={notif.id}
                className={`border-border transition-all cursor-pointer ${notif.is_read ? 'bg-card opacity-60' : 'bg-card'}`}
                onClick={() => {
                  if (!notif.is_read) markReadMutation.mutate(notif.id);
                }}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-secondary' : 'bg-primary/10'}`}>
                    <Icon className={`w-4 h-4 ${notif.is_read ? 'text-muted-foreground' : color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {notif.created_date ? format(new Date(notif.created_date), 'MMM d, h:mm a') : ''}
                    </p>
                  </div>
                  {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}