import { Zap } from 'lucide-react';

const XP_LEVELS = [
  { min: 0,    max: 199,  label: 'Recruit',   color: 'text-muted-foreground' },
  { min: 200,  max: 499,  label: 'Hustler',   color: 'text-primary' },
  { min: 500,  max: 999,  label: 'Performer', color: 'text-chart-3' },
  { min: 1000, max: 2499, label: 'Elite',     color: 'text-accent' },
  { min: 2500, max: Infinity, label: 'Legend', color: 'text-chart-5' },
];

const NEXT_THRESHOLDS = [200, 500, 1000, 2500, Infinity];

export function getLevel(xp) {
  return XP_LEVELS.find(l => xp >= l.min && xp <= l.max) || XP_LEVELS[0];
}

export function getProgress(xp) {
  const level = XP_LEVELS.findIndex(l => xp >= l.min && xp <= l.max);
  if (level === XP_LEVELS.length - 1) return 100;
  const curr = XP_LEVELS[level];
  const nextXP = NEXT_THRESHOLDS[level];
  return Math.round(((xp - curr.min) / (nextXP - curr.min)) * 100);
}

export function getNextThreshold(xp) {
  const level = XP_LEVELS.findIndex(l => xp >= l.min && xp <= l.max);
  return NEXT_THRESHOLDS[level] === Infinity ? null : NEXT_THRESHOLDS[level];
}

export default function XPBadge({ xp = 0, size = 'sm' }) {
  const level = getLevel(xp);
  const isLg = size === 'lg';

  return (
    <div className={`inline-flex items-center gap-1.5 ${isLg ? 'text-base' : 'text-xs'}`}>
      <Zap className={`${isLg ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${level.color}`} />
      <span className={`font-bold ${level.color}`}>{xp.toLocaleString()} XP</span>
      <span className="text-muted-foreground">·</span>
      <span className={`font-medium ${level.color}`}>{level.label}</span>
    </div>
  );
}