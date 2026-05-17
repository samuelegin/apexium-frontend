import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, ExternalLink, CheckCircle2, Loader2, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import XPBadge from '@/components/growth/XPBadge';
import { Task, TaskSubmission } from '@/api/entities';

export default function Tasks() {
  const { user }       = useAuth();
  const queryClient    = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [link,     setLink]     = useState('');
  const [error,    setError]    = useState('');

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
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(proofLink)) throw new Error('Please enter a valid URL starting with http:// or https://');
      const keyword = task.required_keyword?.trim().toLowerCase();
      if (keyword && !proofLink.toLowerCase().includes(keyword) && !proofLink.toLowerCase().includes(keyword.replace('@', ''))) {
        throw new Error(`Submission does not contain required keyword: "${task.required_keyword}"`);
      }
      await TaskSubmission.create({
        task_id:     task.id,
        user_email:  user.email,
        proof_link:  proofLink,
        status:      'approved',
        xp_awarded:  task.xp_reward,
      });
    },
    onSuccess: () => {
      toast.success('Task completed! XP awarded.');
      queryClient.invalidateQueries({ queryKey: ['my-task-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['xp-log'] });
      setSelected(null);
      setLink('');
    },
    onError: (err) => {
      setError(err.message || 'Submission failed.');
    },
  });

  function handleSubmit() {
    setError('');
    submitMutation.mutate({ task: selected, proofLink: link });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete tasks to earn XP and grow your rank.</p>
        </div>
        {user && <XPBadge xp={user.xp_total || 0} />}
      </div>

      {/* X handle warning */}
      {user && !user.x_handle && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Add your X handle in your profile for better task verification.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No tasks available right now</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon.</p>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-3">
        {tasks.map(task => {
          const done = completedIds.has(task.id);
          return (
            <div
              key={task.id}
              onClick={() => !done && setSelected(task)}
              className={`flex items-center justify-between gap-4 p-4 rounded-2xl border bg-card transition-all ${
                done
                  ? 'opacity-60 border-border'
                  : 'border-border hover:border-primary/30 hover:bg-secondary/20 cursor-pointer'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{task.title}</span>
                  {done && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Action: <span className="text-foreground">{task.required_action}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1 text-primary font-semibold text-sm">
                  <Zap className="w-4 h-4" /> +{task.xp_reward} XP
                </div>
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(task); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setLink(''); setError(''); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="rounded-xl bg-secondary/50 border border-border p-3 space-y-1.5 text-sm">
                <p>
                  <span className="text-muted-foreground">Action: </span>
                  <span className="text-foreground">{selected.required_action}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Required keyword: </span>
                  <span className="font-mono text-primary">{selected.required_keyword}</span>
                </p>
                <div className="flex items-center gap-1.5 text-primary font-semibold pt-1">
                  <Zap className="w-4 h-4" /> +{selected.xp_reward} XP reward
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Proof link</label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={link}
                    onChange={e => { setLink(e.target.value); setError(''); }}
                    placeholder="https://x.com/your-post…"
                    className="bg-background border-border"
                  />
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <Info className="w-3 h-3" /> {error}
                  </p>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!link.trim() || submitMutation.isPending}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                  : <><Zap className="w-4 h-4" /> Submit Proof</>
                }
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
