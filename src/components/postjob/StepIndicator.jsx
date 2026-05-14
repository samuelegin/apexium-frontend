import React from 'react';
import { Check } from 'lucide-react';

const steps = ['Details', 'KPIs', 'Deadline', 'Payment'];

export default function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = current > step;
        const active = current === step;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-accent text-accent-foreground' :
                active ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                'bg-secondary text-muted-foreground'
              }`}>
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px ${done ? 'bg-accent' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}