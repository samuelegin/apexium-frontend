import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, ExternalLink, CheckCircle2, Loader2, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import XPBadge from '@/components/growth/XPBadge';
import { Task, TaskSubmission } from '@/api/entities';

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks-active'],
    queryFn: () => Task.filter({ is_active: true }),
  });

  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['my-task-submissions', user?.email],
    queryFn: () => TaskSubmission.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const completedIds = new Set(mySubmissions.map(s => s.task_id));

  const submitMutation = useMutation({
    mutationFn: async ({ task, proofLink }) => {
      // Validate URL
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(proofLink)) throw new Error('Please enter a valid URL starting with http:// or https://');

      // Validate keyword
      const keyword = task.required_keyword?.trim().toLowerCase();
      if (keyword && !proofLink.toLowerCase().includes(keyword) && !proofLink.toLowerCase().includes(keyword.replace('@', ''))) {
        throw new Error(`Submission does not contain required keyword: "${task.required_keyword}"`);
      }

      await TaskSubmission.create({
        task_id: task.id,
        user_email: user.email,
        proof_link: proofLink,
        status: 'approved',
        xp_awarded: task.xp_reward,
      });
    },
    onSuccess: () => {
      toast.success('Task completed! XP awarded.');
      queryClient.invalidateQueries({ queryKey: ['my-task-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['xp-log'] });
      setSelected(null);
      setLink('');
      setError('');
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit() {
    setError('');
    submitMutation.mutate({ task: selected, proofLink: link });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete tasks to earn XP and grow your rank.</p>
        </div>
        {user && <XPBadge xp={user.xp_total || 0} />}
      </div>

      {/* X Handle warning */}
      {user && !user.x_handle && (
        <div className="flex items-center gap-2 text-xs text-chart-3 bg-chart-3/10 border border-chart-3/20 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Add your X handle in your profile for better task verification.
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-secondary/30 animate-pulse" />)}
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks available right now.</p>
          <p className="text-sm">Check back soon.</p>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map(task => {
          const done = completedIds.has(task.id);
          return (
            <Card key={task.id} className={`border-border bg-card transition-all ${done ? 'opacity-60' : 'hover:border-primary/30 cursor-pointer'}`}
              onClick={() => !done && setSelected(task)}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{task.title}</span>
                    {done && <Badge className="bg-accent/20 text-accent border-0 text-xs">Completed</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Action: <span className="text-foreground">{task.required_action}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-accent font-bold text-sm">
                    <Zap className="w-4 h-4" />
                    +{task.xp_reward} XP
                  </div>
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-accent" />
                    : <Button size="sm" variant="outline" className="text-xs h-7 border-primary/30 text-primary" onClick={e => { e.stopPropagation(); setSelected(task); }}>Submit</Button>
                  }
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setLink(''); setError(''); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="rounded-lg bg-secondary/40 border border-border p-3 space-y-1.5 text-sm">
                <p><span className="text-muted-foreground">Action:</span> <span className="text-foreground">{selected.required_action}</span></p>
                <p><span className="text-muted-foreground">Required keyword:</span> <span className="font-mono text-primary">{selected.required_keyword}</span></p>
                <div className="flex items-center gap-1.5 text-accent font-semibold">
                  <Zap className="w-4 h-4" /> +{selected.xp_reward} XP reward
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Proof Link</label>
                <div className="flex gap-2">
                  <Input
                    value={link}
                    onChange={e => { setLink(e.target.value); setError(''); }}
                    placeholder="https://x.com/your-post..."
                    className="bg-background border-border"
                  />
                  <ExternalLink className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
                </div>
                {error && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {error}
                  </p>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!link.trim() || submitMutation.isPending}
                className="w-full bg-primary text-primary-foreground gap-2"
              >
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {submitMutation.isPending ? 'Verifying...' : 'Submit Proof'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}