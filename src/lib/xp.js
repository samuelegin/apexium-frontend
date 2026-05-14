import * as XPLogEntity from '@/api/entities';
import auth from '@/api/authApi';
import { XPLog } from '@/api/entities';

export const XP_VALUES = {
  daily_login: 10,
  task_completed: null, // set per task
  proof_submitted: 15,
  job_completed: 50,
  referral_signup: 100,
  referral_bonus: 25,
};

export const REFERRAL_TIERS = [
  { tier: 1, min: 1,  max: 4,  label: 'Connector',  xp: 100 },
  { tier: 2, min: 5,  max: 14, label: 'Recruiter',  xp: 300 },
  { tier: 3, min: 15, max: Infinity, label: 'Ambassador', xp: 750 },
];

export function getTier(count) {
  return REFERRAL_TIERS.find(t => count >= t.min && count <= t.max) || null;
}

export function getNextTier(count) {
  return REFERRAL_TIERS.find(t => t.min > count) || null;
}

/**
 * Awards XP to a user.
 * Backend should handle: POST /xp-logs + updating the user's xp_total.
 */
export async function awardXP(userEmail, source, xpAmount, label, referenceId = null) {
  await XPLogEntity.XPLog.create({
    user_email: userEmail,
    source,
    xp_amount: xpAmount,
    label,
    reference_id: referenceId,
  });
  // NOTE: xp_total update should be handled server-side when POST /xp-logs is called.
  // If your backend doesn't do this yet, you can call PATCH /auth/me here:
  // await auth.updateMe({ xp_total: currentXP + xpAmount });
}

export function generateReferralCode(email) {
  const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
  const hash = Math.abs(email.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % 9000 + 1000;
  return `${base}${hash}`;
}
