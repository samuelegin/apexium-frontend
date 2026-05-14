import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ChatMessage, Job } from '@/api/entities';

export default function Chat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const selectedJobId = params.get('jobId');
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);

  // Get all jobs where user is employer or jobber
  const { data: chatJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['chat-jobs', user?.email],
    queryFn: async () => {
      const [employer, jobber] = await Promise.all([
        Job.filter({ employer_email: user?.email, status: 'in_progress' }),
        Job.filter({ selected_applicant_email: user?.email, status: 'in_progress' }),
      ]);
      return [...employer, ...jobber];
    },
    enabled: !!user?.email,
  });

  // Fetch the specific job directly when a jobId is in the URL.
  // Fixes the case where the job hasn't appeared in chatJobs list yet.
  const { data: specificJob } = useQuery({
    queryKey: ['chat-specific-job', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const results = await Job.filter({ id: selectedJobId });
      return results[0] ?? null;
    },
    enabled: !!selectedJobId,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['chat-messages', selectedJobId],
    queryFn: () => ChatMessage.filter({ job_id: selectedJobId }, 'created_date', 200),
    enabled: !!selectedJobId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      await ChatMessage.create({
        job_id: selectedJobId,
        sender_email: user.email,
        sender_username: user.username || user.full_name,
        content: message,
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedJobId] });
    },
  });

  const selectedJob = chatJobs.find(j => j.id === selectedJobId) ?? specificJob;

  if (!selectedJobId) {
    return (
      <div className="space-y-6 pb-20 lg:pb-8">
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        {loadingJobs ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : chatJobs.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No active conversations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatJobs.map(job => (
              <Link key={job.id} to={`/chat?jobId=${job.id}`}>
                <Card className="border-border bg-card hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.employer_email === user?.email ? `Jobber: @${job.selected_applicant_username}` : `Employer: @${job.employer_username}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-2rem)]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Link to="/chat">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{selectedJob?.title || 'Chat'}</p>
          <p className="text-xs text-muted-foreground">
            {selectedJob?.employer_email === user?.email ? `@${selectedJob?.selected_applicant_username}` : `@${selectedJob?.employer_username}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {loadingMessages ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-3/4 rounded-xl" />)}</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Start the conversation</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_email === user?.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                }`}>
                  {!isMe && <p className="text-[10px] font-medium opacity-70 mb-0.5">@{msg.sender_username}</p>}
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMutation.mutate(); }} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-card border-border flex-1"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending} className="bg-primary text-primary-foreground shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}