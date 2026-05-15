# Navgrow Engineering Service — Frontend

> React 18 + Vite 4 SPA | Tailwind CSS | Framer Motion | Full-stack with Spring Boot backend

## Quick Start

```bash
npm install
cp .env.example .env          # configure API URL and Razorpay key
npm run dev                    # starts at http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 4 |
| Routing | React Router v6 |
| Styling | Tailwind CSS 3.4 + tailwindcss-animate |
| Animation | Framer Motion 10 |
| UI Components | Radix UI + shadcn/ui |
| HTTP Client | Axios (with JWT interceptor + auto-refresh) |
| State | React Context (Auth + Cart + Wishlist) |
| Payment | Razorpay Checkout.js |

## Project Structure

```
src/
├── App.jsx                  # Route definitions (19 public + 5 admin)
├── main.jsx                 # Root — BrowserRouter > AuthProvider > CartProvider
├── index.css                # Tailwind + custom utilities
├── lib/
│   ├── api.js               # Axios client + all API modules
│   └── utils.js             # cn() utility
├── context/
│   ├── AuthContext.jsx      # Login, logout, JWT, profile
│   └── CartContext.jsx      # Cart + wishlist + localStorage persistence
├── hooks/
│   ├── useApi.js            # useApi, useMutation, usePaginated
│   └── useSeo.js            # Per-page meta/OG/canonical
├── layouts/
│   └── MainLayout.jsx       # Navbar + Footer + CartSidebar + overlays
├── components/              # 25+ reusable components
├── pages/                   # 19 public pages
│   └── admin/               # 5 admin pages (ADMIN/MANAGER only)
└── public/                  # Static assets, manifest.json, sitemap.xml
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8080/api` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay publishable key | rzp_test_... |

## Pages & Routes

| Route | Page | Auth |
|-------|------|------|
| `/` | Home | Public |
| `/about` | About Us | Public |
| `/services` | Services | Public |
| `/projects` | Projects Portfolio | Public |
| `/shop` | B2B Engineering Shop | Public |
| `/wishlist` | Saved Products | Public |
| `/careers` | Job Listings | Public |
| `/news` | News & Updates | Public |
| `/gallery` | Photo Gallery | Public |
| `/contact` | Contact Form | Public |
| `/quote-calculator` | 4-Step Quote Estimator | Public |
| `/track-order` | Order Tracking | Public |
| `/account` | My Profile + Orders | Authenticated |
| `/terms` | Terms & Conditions | Public |
| `/privacy` | Privacy Policy | Public |
| `/refund-policy` | Refund & Shipping Policy | Public |
| `/sitemap` | HTML Sitemap | Public |
| `/admin` | Admin Dashboard | ADMIN/MANAGER |
| `/admin/orders` | Order Management | ADMIN/MANAGER |
| `/admin/products` | Product CRUD | ADMIN/MANAGER |
| `/admin/contacts` | Contact Inbox | ADMIN/MANAGER |
| `/admin/quotes` | Quote Management | ADMIN/MANAGER |

## Build for Production

```bash
npm run build
# Output: /dist — upload to Hostinger /public_html
# .htaccess in /public handles SPA routing
```

## Key Features

- **Authentication** — JWT login/register/forgot-password/reset-password, auto token refresh
- **Shopping Cart** — localStorage persisted, coupon codes, GST (18%), free shipping ≥₹5,000
- **Wishlist** — localStorage persisted, move to cart, heart icon on products
- **Razorpay Payments** — Server-side order creation, HMAC verification, UPI/Card/NetBanking
- **Search** — Ctrl+K site-wide search over 30+ indexed pages
- **PWA** — manifest.json, installable on mobile, app shortcuts
- **SEO** — Per-page meta, OG tags, sitemap.xml, robots.txt, JSON-LD LocalBusiness
- **Admin** — KPI dashboard, order/product/contact/quote management
