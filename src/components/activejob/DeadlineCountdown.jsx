import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { differenceInHours, differenceInMinutes, isPast, parseISO } from 'date-fns';

function getDeadlineState(deadline, jobStatus) {
  if (!deadline) return null;
  if (jobStatus === 'completed') return { type: 'completed', label: 'Completed', color: 'text-accent', bg: 'bg-accent/10 border-accent/30', icon: CheckCircle2 };

  const deadlineDate = typeof deadline === 'string' && deadline.length === 10
    ? new Date(deadline + 'T23:59:59')
    : new Date(deadline);

  if (isPast(deadlineDate)) {
    return { type: 'overdue', label: 'Overdue', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: XCircle };
  }

  const hoursLeft = differenceInHours(deadlineDate, new Date());
  const minutesLeft = differenceInMinutes(deadlineDate, new Date());

  if (hoursLeft < 24) {
    const display = hoursLeft < 1 ? `${minutesLeft}m left` : `${hoursLeft}h left`;
    return { type: 'near', label: `Near Deadline — ${display}`, color: 'text-chart-3', bg: 'bg-chart-3/10 border-chart-3/30', icon: AlertTriangle };
  }

  const days = Math.floor(hoursLeft / 24);
  const remainingHours = hoursLeft % 24;
  const display = days > 0 ? `${days}d ${remainingHours}h left` : `${hoursLeft}h left`;
  return { type: 'active', label: `Active — ${display}`, color: 'text-primary', bg: 'bg-primary/10 border-primary/30', icon: Clock };
}

export default function DeadlineCountdown({ deadline, jobStatus }) {
  const [state, setState] = useState(() => getDeadlineState(deadline, jobStatus));

  useEffect(() => {
    setState(getDeadlineState(deadline, jobStatus));
    const interval = setInterval(() => {
      setState(getDeadlineState(deadline, jobStatus));
    }, 60000);
    return () => clearInterval(interval);
  }, [deadline, jobStatus]);

  if (!state) return null;

  const Icon = state.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${state.bg} ${state.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {state.label}
    </div>
  );
}