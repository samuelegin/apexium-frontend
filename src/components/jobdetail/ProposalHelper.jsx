import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const TEMPLATES = [
  {
    label: 'Results-focused',
    text: (title) => `I'm excited to apply for "${title}". I have experience delivering measurable results on similar KPI-driven tasks. I will focus on achieving each target systematically and provide clear proof of completion. I'm responsive, reliable, and committed to hitting every metric on time.`,
  },
  {
    label: 'Strategy-led',
    text: (title) => `I can help you achieve the KPIs outlined for "${title}" by applying a structured, data-driven approach. I'll begin with a quick audit of baselines, then execute a focused plan to hit each target. I'll share progress regularly and deliver verifiable proof at each milestone.`,
  },
  {
    label: 'Experienced specialist',
    text: (title) => `I've worked on similar projects and am confident I can deliver the results required for "${title}". My approach is transparent — I'll keep you updated, submit proof at each step, and make sure every KPI is backed by real, trackable data.`,
  },
];

export default function ProposalHelper({ jobTitle, onInsert }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Proposal Suggestion Helper</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Pick a template to get started — you can edit it after inserting:</p>
              {TEMPLATES.map((t, i) => (
                <div key={i} className="p-3 rounded-md bg-card border border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground">{t.label}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { onInsert(t.text(jobTitle)); setOpen(false); }}
                      className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                    >
                      Insert
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{t.text(jobTitle)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}