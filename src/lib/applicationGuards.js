import { Application } from '@/api/entities';

const DAILY_LIMIT  = 8;
const COOLDOWN_MS  = 20 * 1000;
const COOLDOWN_KEY = 'apx_last_apply_ts';

export async function checkCanApply(userEmail) {
  const lastTs  = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
  const elapsed = Date.now() - lastTs;

  if (lastTs && elapsed < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return { allowed: false, reason: `cooldown:${remaining}` };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayApps = await Application.filter({ applicant_email: userEmail });
  const todayCount = todayApps.filter(a => new Date(a.created_date) >= todayStart).length;

  if (todayCount >= DAILY_LIMIT) {
    return { allowed: false, reason: 'daily_limit' };
  }

  return { allowed: true, reason: null };
}

export function recordApplicationTimestamp() {
  localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
}

export function getCooldownRemaining() {
  const lastTs = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
  if (!lastTs) return 0;
  const elapsed = Date.now() - lastTs;
  return elapsed < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - elapsed) / 1000) : 0;
}

export function getRelevanceWarning(jobCategory, topCategories = []) {
  if (!topCategories.length) return null;
  const matched = topCategories.some(c => c.toLowerCase() === (jobCategory || '').toLowerCase());
  return matched ? null : "Your profile may not strongly match this job's requirements.";
}

export function isQuickApplyEligible(user) {
  return (user?.completed_jobs || 0) >= 1 || (user?.average_pi_score || 0) >= 60;
}
