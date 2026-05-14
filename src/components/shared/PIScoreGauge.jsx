import React from 'react';
import { motion } from 'framer-motion';

export default function PIScoreGauge({ score, size = 'lg' }) {
  const sizes = {
    sm: { dim: 80, stroke: 6, textSize: 'text-lg' },
    md: { dim: 120, stroke: 8, textSize: 'text-2xl' },
    lg: { dim: 160, stroke: 10, textSize: 'text-4xl' },
  };
  const { dim, stroke, textSize } = sizes[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return 'hsl(var(--accent))';
    if (s >= 50) return 'hsl(var(--chart-3))';
    if (s >= 25) return 'hsl(var(--chart-1))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke={getColor(score)}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className={`${textSize} font-bold font-mono text-foreground`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">PI Score</span>
      </div>
    </div>
  );
}