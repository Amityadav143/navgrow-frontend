/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';

// ── Base instance ─────────────────────────────────────────────────────────────
/**
 * API base resolution.
 *  · Production builds: use VITE_API_BASE_URL unless it points at localhost —
 *    a stray machine-local .env file must never ship a localhost URL to real
 *    users (this exact bug once sent Google-login to http://localhost:8080).
 *    Falls back to same-origin '/api' (reverse-proxied to the backend).
 *  · Dev: VITE_API_BASE_URL or the local Spring Boot default.
 */
const RAW_API_URL = import.meta.env.VITE_API_BASE_URL;
const IS_LOCAL_URL = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i;
export const API_BASE = import.meta.env.PROD
  ? (RAW_API_URL && !IS_LOCAL_URL.test(RAW_API_URL) ? RAW_API_URL : '/api')
  : (RAW_API_URL || 'http://localhost:8080/api');

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30s default; chat overrides to 45s
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ng_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — handle 401 (token refresh) ────────────────────────
// Global error safety net — toast ONLY for network failures and 5xx server
// errors (with the X-Request-Id reference when present). 4xx are owned by the
// calling page/form, and 401 is owned by the silent token-refresh flow below.
// Deduped so a burst of failing calls shows a single toast.
let _lastErrToastAt = 0;
function surfaceUnexpectedError(error) {
  try {
    if (error.config?.skipErrorToast) return;
    const now = Date.now();
    if (now - _lastErrToastAt < 5000) return;
    const status = error.response?.status;
    if (!error.response) {
      _lastErrToastAt = now;
      toast({ title: 'Connection problem', description: 'Could not reach the server. Check your internet connection and try again.', variant: 'destructive' });
    } else if (status >= 500) {
      _lastErrToastAt = now;
      const ref = error.response.headers?.['x-request-id'];
      toast({ title: 'Server error', description: `Something went wrong on our side. Please try again${ref ? ` (ref: ${ref})` : ''}.`, variant: 'destructive' });
    }
  } catch { /* the safety net itself must never throw */ }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('ng_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${API_BASE}/auth/refresh`,
            null,
            { params: { refreshToken } },
          );
          localStorage.setItem('ng_access_token', data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          // Refresh failed — clear tokens
          localStorage.removeItem('ng_access_token');
          localStorage.removeItem('ng_refresh_token');
          localStorage.removeItem('ng_user');
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      }
    }
    surfaceUnexpectedError(error);
    return Promise.reject(error);
  },
);

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (email, password)       => api.post('/auth/login',    { email, password }),
  loginWithPhone: (phone, password)       => api.post('/auth/login-with-phone', { phone, password }),
  register:       (data)                  => api.post('/auth/register',  data),
  refresh:        (refreshToken)          => api.post('/auth/refresh',   null, { params: { refreshToken } }),
  forgotPw:       (email)                 => api.post('/auth/forgot-password', null, { params: { email } }),
  resetPw:        (token, password)       => api.post('/auth/reset-password', { token, newPassword: password }),
  sendOtp:        (phone)                 => api.post('/auth/send-otp',  null, { params: { phone } }),
  verifyOtp:      (phone, otp)            => api.post('/auth/verify-otp', { phone, otp }),
  logout:         ()                      => api.post('/auth/logout'),
};

// ── Products API ──────────────────────────────────────────────────────────────
export const productsApi = {
  related: (id, limit = 4) => api.get(`/products/${id}/related`, { params: { limit } }),
  list:       (params) => api.get('/products', { params }),
  get:        (slug)   => api.get(`/products/${slug}`),
  featured:   ()       => api.get('/products/featured'),
  categories: ()       => api.get('/products/categories'),
  reviews:    (id)     => api.get(`/products/${id}/reviews`),
  addReview:  (id, d)  => api.post(`/products/${id}/reviews`, d),
  create:     (d)      => api.post('/products', d),
  bulkCreate: (list)   => api.post('/products/bulk', list),
  update:     (id, d)  => api.put(`/products/${id}`, d),
  delete:     (id)     => api.delete(`/products/${id}`),
  updateStock:(id, q)  => api.patch(`/products/${id}/stock`, null, { params: { qty: q } }),
};

// ── Orders API ────────────────────────────────────────────────────────────────
export const ordersApi = {
  invoiceUrl:  (orderNumber, email) => `${api.defaults.baseURL}/orders/${orderNumber}/invoice?email=${encodeURIComponent(email || '')}`,
  create:        (d)      => api.post('/orders', d),
  verifyPayment: (d)      => api.post('/orders/payment/verify', d),
  track:         (num)    => api.get(`/orders/track/${num}`),
  myOrders:      (params) => api.get('/orders/mine', { params }),
  getById:       (id)     => api.get(`/orders/${id}`),
  // Admin
  list:          (params) => api.get('/orders', { params }),
  updateStatus:  (id, st, extra) => api.patch(`/orders/${id}/status`, null, { params: { status: st, ...extra } }),
};

// ── Contact API ───────────────────────────────────────────────────────────────
export const contactApi = {
  submit:     (d)      => api.post('/contact', d),
  list:       (params) => api.get('/contact', { params }),
  markRead:   (id)     => api.patch(`/contact/${id}/read`),
  unreadCount:()       => api.get('/contact/unread-count'),
  reply:      (id, d)  => api.post(`/contact/${id}/reply`, d),
};

// ── Quotes API ────────────────────────────────────────────────────────────────
export const quotesApi = {
  submit:      (d)           => api.post('/quotes', d),
  list:        (params)      => api.get('/quotes', { params }),
  updateStatus:(id, st, amt) => api.patch(`/quotes/${id}/status`, null, { params: { status: st, quotedAmount: amt } }),
};

// ── Delivery serviceability & zones ─────────────────────────────────────────
export const deliveryApi = {
  // Public: is this pincode serviceable, at what charge, by when.
  // `qty` (total units in the order) drives the volume-based delivery tier so the
  // quoted charge matches what the order endpoint will bill.
  check:      (pincode, orderValue, qty) =>
                api.get('/delivery/check', { params: { pincode, orderValue, qty } }),
  // Admin
  zones:      ()        => api.get('/delivery/zones'),
  createZone: (d)       => api.post('/delivery/zones', d),
  updateZone: (id, d)   => api.put(`/delivery/zones/${id}`, d),
  deleteZone: (id)      => api.delete(`/delivery/zones/${id}`),
  testZone:   (pincode, orderValue) =>
                api.get('/delivery/zones/test', { params: { pincode, orderValue } }),
};

// ── Category tax rules (admin: HSN/SAC + GST per category) ───────────────────
export const taxRulesApi = {
  list:    ()          => api.get('/tax-rules'),
  create:  (d)         => api.post('/tax-rules', d),
  update:  (id, d)     => api.put(`/tax-rules/${id}`, d),
  remove:  (id)        => api.delete(`/tax-rules/${id}`),
  // onlyMissing=false forces every product in the category onto the rule
  apply:   (id, onlyMissing = true) =>
             api.post(`/tax-rules/${id}/apply`, null, { params: { onlyMissing } }),
};

// ── Catalogue download + lead capture ─────────────────────────────────────────
export const catalogueApi = {
  // Public: capture the lead, returns { message, reference, downloadUrl }
  capture:      (d)      => api.post('/catalogue/leads', d),
  // Absolute URL to stream the PDF (used for the actual download link)
  downloadUrl:  ()       => `${API_BASE}/catalogue/download`,
  // Admin
  listLeads:    (params) => api.get('/catalogue/leads', { params }),
  leadStats:    ()       => api.get('/catalogue/leads/stats'),
  updateLead:   (id, params) => api.patch(`/catalogue/leads/${id}/status`, null, { params }),
  deleteLead:   (id)     => api.delete(`/catalogue/leads/${id}`),
};


// ── RFQ (Request for Quote) API ───────────────────────────────────────────────
export const rfqApi = {
  submit:      (d)             => api.post('/rfqs', d),
  track:       (number)        => api.get(`/rfqs/track/${number}`),
  mine:        (params)        => api.get('/rfqs/mine', { params }),
  accept:      (id)            => api.post(`/rfqs/${id}/accept`),
  reject:      (id, reason)    => api.post(`/rfqs/${id}/reject`, { reason }),
  list:        (params)        => api.get('/rfqs', { params }),
  detail:      (id)            => api.get(`/rfqs/${id}`),
  quote:       (id, d)         => api.put(`/rfqs/${id}/quote`, d),
  updateStatus:(id, d)         => api.patch(`/rfqs/${id}/status`, d),
};

// ── Newsletter API ────────────────────────────────────────────────────────────
export const newsletterApi = {
  subscribe:   (email, name) => api.post('/newsletter/subscribe', null, { params: { email, name } }),
  unsubscribe: (email)       => api.post('/newsletter/unsubscribe', null, { params: { email } }),
  count:       ()            => api.get('/newsletter/count'),
};

// ── Projects API ──────────────────────────────────────────────────────────────
export const projectsApi = {
  list:    ()      => api.get('/projects'),
  get:     (slug)  => api.get(`/projects/${slug}`),
  featured:()      => api.get('/projects/featured'),
  create:  (d)     => api.post('/projects', d),
  update:  (id, d) => api.put(`/projects/${id}`, d),
  delete:  (id)    => api.delete(`/projects/${id}`),
};

// ── News API ──────────────────────────────────────────────────────────────────
export const newsApi = {
  list:   (params) => api.get('/news', { params }),
  manage: (params) => api.get('/news/manage', { params }),
  get:    (slug)   => api.get(`/news/${slug}`),
  create: (d)      => api.post('/news', d),
  update: (id, d)  => api.put(`/news/${id}`, d),
  delete: (id)     => api.delete(`/news/${id}`),
};

// ── Tenders API ───────────────────────────────────────────────────────────────
export const tendersApi = {
  list:    ()      => api.get('/tenders'),
  manage:  ()      => api.get('/tenders/manage'),
  featured:()      => api.get('/tenders/featured'),
  create:  (d)     => api.post('/tenders', d),
  update:  (id, d) => api.put(`/tenders/${id}`, d),
  delete:  (id)    => api.delete(`/tenders/${id}`),
};

// ── Jobs API ──────────────────────────────────────────────────────────────────
export const jobsApi = {
  list:           (p)      => api.get('/jobs', { params: p }),
  manage:         ()       => api.get('/jobs/manage'),
  get:            (id)     => api.get(`/jobs/${id}`),
  apply:          (id, d)  => api.post(`/jobs/${id}/apply`, d),
  // Uploads a CV and returns { url } to attach to an application.
  uploadResume:   (file)   => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/jobs/resume', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  applications:   (id, p)  => api.get(`/jobs/${id}/applications`, { params: p }),
  updateAppStatus:(id, st) => api.patch(`/jobs/applications/${id}/status`, null, { params: { status: st } }),
  create:         (d)      => api.post('/jobs', d),
  update:         (id, d)  => api.put(`/jobs/${id}`, d),
  delete:         (id)     => api.delete(`/jobs/${id}`),
  toggle:         (id)     => api.patch(`/jobs/${id}/toggle`),
};

// ── Gallery API ───────────────────────────────────────────────────────────────
export const galleryApi = {
  list:   (p)      => api.get('/gallery', { params: p }),
  create: (d)      => api.post('/gallery', d),
  update: (id, d)  => api.put(`/gallery/${id}`, d),
  delete: (id)     => api.delete(`/gallery/${id}`),
};

// ── Coupons API ───────────────────────────────────────────────────────────────
export const couponsApi = {
  validate: (code, amount) => api.post('/coupons/validate', null, { params: { code, amount } }),
  list:     ()             => api.get('/coupons'),
  create:   (d)            => api.post('/coupons', d),
  update:   (id, d)        => api.put(`/coupons/${id}`, d),
  delete:   (id)           => api.delete(`/coupons/${id}`),
  toggle:   (id)           => api.patch(`/coupons/${id}/toggle`),
};

// ── User addresses API ────────────────────────────────────────────────────────
export const addressApi = {
  list:    ()       => api.get('/users/me/addresses'),
  create:  (d)      => api.post('/users/me/addresses', d),
  update:  (id, d)  => api.put(`/users/me/addresses/${id}`, d),
  delete:  (id)     => api.delete(`/users/me/addresses/${id}`),
  setDefault: (id, type) => api.patch(`/users/me/addresses/${id}/default`, null, { params: { type } }),
};

// ── Company / GST profile ────────────────────────────────────────────────────
export const companyApi = {
  get:    () => api.get('/users/me/company'),
  save:   (d)=> api.put('/users/me/company', d),
};

// ── Audit log API ────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
};

// ── User management (admin) ──────────────────────────────────────────────────
export const adminUsersApi = {
  list:       (p)     => api.get('/users', { params: p }),
  get:        (id)    => api.get(`/users/${id}`),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, null, { params: { role } }),
  toggleActive:(id)   => api.patch(`/users/${id}/toggle-active`),
  delete:     (id)    => api.delete(`/users/${id}`),
  create:     (d)     => api.post('/users/admin/create', d),
};

// ── Jobs admin API ────────────────────────────────────────────────────────────

// ── Gallery admin API ─────────────────────────────────────────────────────────

// ── Tenders admin API ─────────────────────────────────────────────────────────

// ── Analytics API ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  track: (event) => api.post('/analytics/track', event, { skipErrorToast: true }),
  dashboard:    () => api.get('/admin/analytics/dashboard'),
  recentOrders: () => api.get('/admin/analytics/recent-orders'),
  funnel:       (days) => api.get('/admin/analytics/funnel', { params: { days: days || 30 } }),
};

// ── User API ──────────────────────────────────────────────────────────────────
export const userApi = {
  profile:       () => api.get('/users/me'),
  updateProfile: (d)=> api.put('/users/me', d),
  changePassword:(d)=> api.post('/users/me/change-password', d),
  list:          (p)=> api.get('/users', { params: p }),
};

export default api;

// ── Chat API ──────────────────────────────────────────────────────────────────
export const chatApi = {
  send:     (messages) => api.post('/chat', { messages }),
  starters: ()         => api.get('/chat/starters'),
};

// ── Debounce utility ─────────────────────────────────────────────────────────

// ── Site Settings API ─────────────────────────────────────────────────────────
export const siteSettingsApi = {
  get:  ()  => api.get('/site-settings'),
  save: (settingsJson) => api.put('/site-settings', { settings: settingsJson }),
};

export const debounce = (fn, ms = 300) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

// ── File uploads (admin) ──────────────────────────────────────────────────────
export const filesApi = {
  /** Uploads an image/PDF; resolves to { url, fileName, originalName, size, kind }. */
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Catalog (admin-managed categories & services) ─────────────────────────────
export const catalogApi = {
  list:   (type)   => api.get('/catalog', { params: { type } }),
  manage: (type)   => api.get('/catalog/manage', { params: type ? { type } : {} }),
  create: (d)      => api.post('/catalog', d),
  update: (id, d)  => api.put(`/catalog/${id}`, d),
  delete: (id)     => api.delete(`/catalog/${id}`),
};
