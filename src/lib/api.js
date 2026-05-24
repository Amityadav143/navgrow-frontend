import axios from 'axios';

// ── Base instance ─────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL',
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
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/refresh`,
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
    return Promise.reject(error);
  },
);

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (email, password)       => api.post('/auth/login',    { email, password }),
  loginWithPhone: (phone, password)       => api.post('/auth/login',    { phone, password }),
  register:       (data)                  => api.post('/auth/register',  data),
  refresh:        (refreshToken)          => api.post('/auth/refresh',   null, { params: { refreshToken } }),
  forgotPw:       (email)                 => api.post('/auth/forgot-password', null, { params: { email } }),
  resetPw:        (token, password)       => api.post('/auth/reset-password', { token, newPassword: password }),
  sendOtp:        (phone)                 => api.post('/auth/send-otp',  null, { params: { phone } }),
  verifyOtp:      (phone, otp)            => api.post('/auth/verify-otp', { phone, otp }),
};

// ── Products API ──────────────────────────────────────────────────────────────
export const productsApi = {
  list:       (params) => api.get('/products', { params }),
  get:        (slug)   => api.get(`/products/${slug}`),
  featured:   ()       => api.get('/products/featured'),
  categories: ()       => api.get('/products/categories'),
  reviews:    (id)     => api.get(`/products/${id}/reviews`),
  addReview:  (id, d)  => api.post(`/products/${id}/reviews`, d),
  create:     (d)      => api.post('/products', d),
  update:     (id, d)  => api.put(`/products/${id}`, d),
  delete:     (id)     => api.delete(`/products/${id}`),
  updateStock:(id, q)  => api.patch(`/products/${id}/stock`, null, { params: { qty: q } }),
};

// ── Orders API ────────────────────────────────────────────────────────────────
export const ordersApi = {
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
  get:    (slug)   => api.get(`/news/${slug}`),
  create: (d)      => api.post('/news', d),
  update: (id, d)  => api.put(`/news/${id}`, d),
  delete: (id)     => api.delete(`/news/${id}`),
};

// ── Tenders API ───────────────────────────────────────────────────────────────
export const tendersApi = {
  list:    ()      => api.get('/tenders'),
  featured:()      => api.get('/tenders/featured'),
  create:  (d)     => api.post('/tenders', d),
  update:  (id, d) => api.put(`/tenders/${id}`, d),
  delete:  (id)    => api.delete(`/tenders/${id}`),
};

// ── Jobs API ──────────────────────────────────────────────────────────────────
export const jobsApi = {
  list:           ()       => api.get('/jobs'),
  get:            (id)     => api.get(`/jobs/${id}`),
  apply:          (id, d)  => api.post(`/jobs/${id}/apply`, d),
  applications:   (id, p)  => api.get(`/jobs/${id}/applications`, { params: p }),
  updateAppStatus:(id, st) => api.patch(`/jobs/applications/${id}/status`, null, { params: { status: st } }),
  create:         (d)      => api.post('/jobs', d),
  update:         (id, d)  => api.put(`/jobs/${id}`, d),
};

// ── Gallery API ───────────────────────────────────────────────────────────────
export const galleryApi = {
  list:   (cat) => api.get('/gallery', cat ? { params: { category: cat } } : {}),
  create: (d)   => api.post('/gallery', d),
  delete: (id)  => api.delete(`/gallery/${id}`),
};

// ── Coupons API ───────────────────────────────────────────────────────────────
export const couponsApi = {
  validate: (code, amount) => api.post('/coupons/validate', null, { params: { code, amount } }),
  list:     ()             => api.get('/coupons'),
  create:   (d)            => api.post('/coupons', d),
  toggle:   (id)           => api.patch(`/coupons/${id}/toggle`),
};

// ── Analytics API ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard:    () => api.get('/admin/analytics/dashboard'),
  recentOrders: () => api.get('/admin/analytics/recent-orders'),
  revenue:      (period) => api.get('/admin/analytics/revenue', { params: { period } }),
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
export const debounce = (fn, ms = 300) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};
