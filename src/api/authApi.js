import api from './apiClient';

const TOKEN_KEY = 'apex_token';

const auth = {
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  hasToken() {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  me() {
    return api.get('/auth/me');
  },

  /**
   * Log in with email + password.
   * Automatically stores the returned token.
   *
   * @returns {{ token: string, user: object }}
   */
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    if (data?.token) auth.setToken(data.token);
    return data;
  },

  async logout() {
    try { await api.post('/auth/logout', {}); } catch (_) {}
    auth.clearToken();
  },

  updateMe(fields) {
    return api.patch('/auth/me', fields);
  },

  async register(email, password, fullName, username, referralCode) {
    const payload = { email, password, full_name: fullName };
    if (username) payload.username = username;
    if (referralCode) payload.referral_code = referralCode;
    const data = await api.post('/auth/register', payload);
    return data;
  },

  async resendVerification(email) {
    const data = await api.post('/auth/resend-verification', { email });
    return data;
  },

  async verifyEmail(email, code) {
    const data = await api.post('/auth/verify-email', { email, code });
    if (data?.token) auth.setToken(data.token);
    return data;
  },

  async uploadFile(file, type = 'general') {
    const token = localStorage.getItem(TOKEN_KEY);
    const form  = new FormData();
    form.append('file', file);

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/uploads?type=${type}`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
    );
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json(); // { file_url, user }
  },

  async disconnectTelegram() {
    return api.post('/auth/telegram/disconnect');
  },

  async generateProposal(prompt) {
    const data = await api.post('/ai/proposal', { prompt });
    return data?.text ?? '';
  },
};

export default auth;