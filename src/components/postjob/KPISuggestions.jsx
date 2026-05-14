import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTIONS = {
  marketing: [
    { name: 'Increase social media followers', target_value: '1,000 new followers', weight: '', baseline: 'Current followers: ' },
    { name: 'Achieve engagement rate', target_value: '5% engagement rate', weight: '', baseline: '' },
    { name: 'Generate impressions', target_value: '50,000 impressions', weight: '', baseline: '' },
    { name: 'Run paid ad campaigns', target_value: '3 campaigns launched', weight: '', baseline: '' },
  ],
  other: [
    { name: 'Complete project deliverables', target_value: '3 milestones delivered', weight: '', baseline: '' },
    { name: 'Achieve quality benchmark', target_value: 'Score 90%+ on review', weight: '', baseline: '' },
    { name: 'Meet deadline compliance', target_value: '100% on-time delivery', weight: '', baseline: '' },
  ],
  content: [
    { name: 'Publish blog posts', target_value: '12 posts', weight: '', baseline: '' },
    { name: 'Reach views per post', target_value: '500 views per post', weight: '', baseline: '' },
    { name: 'Create video content', target_value: '8 videos published', weight: '', baseline: '' },
    { name: 'Grow content engagement', target_value: '200 shares per piece', weight: '', baseline: '' },
  ],
  community: [
    { name: 'Grow community members', target_value: '300 new members', weight: '', baseline: 'Current members: ' },
    { name: 'Increase daily active users', target_value: '100 DAU', weight: '', baseline: '' },
    { name: 'Host community events', target_value: '4 events', weight: '', baseline: '' },
  ],
  sales: [
    { name: 'Close new deals', target_value: '10 deals closed', weight: '', baseline: '' },
    { name: 'Generate qualified leads', target_value: '50 leads', weight: '', baseline: '' },
    { name: 'Achieve revenue target', target_value: '$5,000 in revenue', weight: '', baseline: '' },
  ],
  development: [
    { name: 'Deliver feature milestones', target_value: '3 features shipped', weight: '', baseline: '' },
    { name: 'Reduce bug count', target_value: 'Under 5 open bugs', weight: '', baseline: 'Current bugs: ' },
    { name: 'Improve page load speed', target_value: 'Under 2s load time', weight: '', baseline: '' },
  ],
  design: [
    { name: 'Deliver design assets', target_value: '10 screens designed', weight: '', baseline: '' },
    { name: 'Complete brand kit', target_value: 'Full brand kit delivered', weight: '', baseline: '' },
    { name: 'Conduct usability tests', target_value: '3 test sessions', weight: '', baseline: '' },
  ],
  analytics: [
    { name: 'Build reporting dashboard', target_value: '1 dashboard live', weight: '', baseline: '' },
    { name: 'Deliver weekly data reports', target_value: '4 weekly reports', weight: '', baseline: '' },
    { name: 'Identify growth insights', target_value: '5 actionable insights', weight: '', baseline: '' },
  ],
  operations: [
    { name: 'Streamline onboarding process', target_value: 'Reduce time by 30%', weight: '', baseline: '' },
    { name: 'Implement SOP documentation', target_value: '5 SOPs documented', weight: '', baseline: '' },
  ],
};

export default function KPISuggestions({ category, onInsert }) {
  const [open, setOpen] = useState(true);
  const suggestions = SUGGESTIONS[category] || [];

  if (!suggestions.length) return null;

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI Suggestions for {category}</span>
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
              <p className="text-xs text-muted-foreground mb-2">Click any suggestion to auto-fill a new KPI:</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onInsert(s)}
                  className="w-full text-left px-3 py-2 rounded-md bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Target: {s.target_value}</p>
                    </div>
                    <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">+ Insert</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}