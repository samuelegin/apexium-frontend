import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Zap, ShieldAlert, Loader2, ToggleLeft, ToggleRight, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Task } from '@/api/entities';

const EMPTY = { title: '', description: '', required_action: '', required_keyword: '', xp_reward: 50, is_active: true };

export default function AdminPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal,         setModal]         = useState(null);
  const [form,          setForm]          = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: () => Task.list('-created_date'),
  });

  const createMut = useMutation({
    mutationFn: d => Task.create(d),
    onSuccess: () => { toast.success('Task created!'); qc.invalidateQueries({ queryKey: ['admin-tasks'] }); closeModal(); },
    onError: e => toast.error(e?.message || 'Failed to create task'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => Task.update(id, data),
    onSuccess: () => { toast.success('Task updated!'); qc.invalidateQueries({ queryKey: ['admin-tasks'] }); closeModal(); },
    onError: e => toast.error(e?.message || 'Failed to update task'),
  });

  const deleteMut = useMutation({
    mutationFn: id => Task.delete(id),
    onSuccess: () => { toast.success('Task deleted.'); qc.invalidateQueries({ queryKey: ['admin-tasks'] }); setDeleteConfirm(null); },
    onError: e => toast.error(e?.message || 'Failed to delete task'),
  });

  // ── Access guard — after all hooks ────────────────────────────────────────
  if (!user) return null;
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-sm max-w-xs">This panel is restricted to administrators only.</p>
        <Link to="/"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to App</Button></Link>
      </div>
    );
  }

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit   = t => { setForm({ ...t }); setModal('edit'); };
  const closeModal = () => { setModal(null); setForm(EMPTY); };

  const handleSave = () => {
    if (!form.title.trim() || !form.required_action.trim() || !form.required_keyword.trim() || !form.xp_reward) {
      toast.error('Please fill all required fields.'); return;
    }
    modal === 'create' ? createMut.mutate(form) : updateMut.mutate({ id: form.id, data: form });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin header — completely separate from AppLayout */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-semibold text-foreground text-sm">Admin Panel</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0 text-xs">{user.email}</Badge>
          </div>
          <Button onClick={openCreate} size="sm" className="bg-primary text-primary-foreground gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Task
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} — {tasks.filter(t => t.is_active).length} active
          </p>
        </div>

        {isLoading && (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />)}</div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No tasks yet. Create your first one.</p>
          </div>
        )}

        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">{task.title}</span>
                      <Badge className={task.is_active ? 'bg-accent/20 text-accent border-0 text-xs' : 'bg-secondary text-muted-foreground border-0 text-xs'}>
                        {task.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge className="bg-primary/20 text-primary border-0 text-xs flex items-center gap-0.5">
                        <Zap className="w-3 h-3" />{task.xp_reward} XP
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    <div className="flex gap-4 mt-1">
                      <p className="text-xs text-muted-foreground">Action: <span className="text-foreground">{task.required_action}</span></p>
                      <p className="text-xs text-muted-foreground">Keyword: <span className="font-mono text-foreground">{task.required_keyword}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="w-8 h-8"
                      onClick={() => updateMut.mutate({ id: task.id, data: { is_active: !task.is_active } })}>
                      {task.is_active
                        ? <ToggleRight className="w-4 h-4 text-accent" />
                        : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEdit(task)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => setDeleteConfirm(task)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Create / Edit */}
      <Dialog open={!!modal} onOpenChange={closeModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{modal === 'create' ? 'Create Task' : 'Edit Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: 'title',            label: 'Task Title *',        placeholder: 'e.g. Post about Work3Labs on X' },
              { key: 'required_action',  label: 'Required Action *',   placeholder: 'e.g. Post a tweet mentioning @Work3Labs' },
              { key: 'required_keyword', label: 'Required Keyword *',  placeholder: 'e.g. @Work3Labs' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <Input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="bg-background border-border" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the task..." className="bg-background border-border min-h-[80px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">XP Reward *</label>
              <Input type="number" min={1} value={form.xp_reward || ''} onChange={e => setForm(f => ({ ...f, xp_reward: Number(e.target.value) }))}
                className="bg-background border-border" />
            </div>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="w-full bg-primary text-primary-foreground gap-2">
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              {modal === 'create' ? 'Create Task' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Delete Task?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "<span className="text-foreground">{deleteConfirm?.title}</span>"? This cannot be undone.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
