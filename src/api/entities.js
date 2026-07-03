import api from './apiClient';

function buildQuery(filters = {}, sort = null, limit = null) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      params.set(k, typeof v === 'boolean' ? (v ? 1 : 0) : v);
    }
  });
  if (sort)  params.set('_sort', sort);
  if (limit) params.set('_limit', limit);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function entity(resource) {
  return {
    list: (sort = null, limit = null) =>
      api.get(`/${resource}${buildQuery({}, sort, limit)}`),

    filter: (filters = {}, sort = null, limit = null) =>
      api.get(`/${resource}${buildQuery(filters, sort, limit)}`),
    get: (id) => api.get(`/${resource}/${id}`),
    create: (data) => api.post(`/${resource}`, data),
    bulkCreate: (items) => api.post(`/${resource}/bulk`, items),
    update: (id, data) => api.patch(`/${resource}/${id}`, data),
    delete: (id) => api.delete(`/${resource}/${id}`),
  };
}

export const Job = entity('jobs');
export const KPI = entity('kpis');
export const Application = entity('applications');
export const ProofSubmission = entity('proof-submissions');
export const ChatMessage = entity('chat-messages');
export const Notification = entity('notifications');
export const Task = entity('tasks');
export const TaskSubmission = entity('task-submissions');
export const XPLog = entity('xp-logs');
export const Referral = entity('referrals');
export const User = entity('users');

/**
 * Escrow — talks to the non-CRUD escrow routes in the backend (src/escrow.js).
 * These aren't REST resources, so they don't fit the entity() helper shape.
 */
export const Escrow = {
  /** Tell the backend a tx was sent so it decodes the receipt immediately
   *  instead of waiting on the ~15s reconcile safety-net. */
  notify: (jobId, txHash, type) => api.post('/escrow/notify', { jobId, txHash, type }),

  /** Employer proposes the pod payout split. shares: [{ email, share }]. */
  proposePodShares: (applicationId, shares) =>
    api.post('/escrow/pod-shares', { applicationId, shares }),

  /** A pod member approves the currently-proposed split. */
  approvePodShares: (applicationId) =>
    api.post('/escrow/pod-shares/approve', { applicationId }),
};