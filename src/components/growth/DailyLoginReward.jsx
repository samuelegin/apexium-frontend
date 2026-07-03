import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { awardXP, XP_VALUES } from '@/lib/xp';

export default function DailyLoginReward({ user, onXPAwarded }) {
  const [show, setShow] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!user?.email) return;
    if (attempted.current) return;
    attempted.current = true;
    attemptAward();
  }, [user?.email]);

  async function attemptAward() {
    try {
      await awardXP(user.email, 'daily_login', XP_VALUES.daily_login, 'Daily Login Reward');
      setShow(true);
      setTimeout(() => setShow(false), 4000);
      console.log(`[DailyXP] +${XP_VALUES.daily_login} XP awarded to ${user.email}`);
      if (onXPAwarded) onXPAwarded();

    } catch (err) {
      console.log('[DailyXP] Not awarded:', err?.message);
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.9 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-accent/40 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Daily Login Reward 🎉</p>
            <p className="text-accent text-xs font-mono">+{XP_VALUES.daily_login} XP earned</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}