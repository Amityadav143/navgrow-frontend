# NAVGROW ENGINEERING SERVICE - COMPLETE PRODUCT DOCUMENTATION

**Version**: 1.0  
**Date**: January 2025  
**Company**: Navgrow Engineering Service Pvt. Ltd.  
**Location**: Siliguri, West Bengal, India  
**Website**: https://navgrow.org

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Feature Modules](#feature-modules)
6. [User Journey Maps](#user-journey-maps)
7. [Database Schema](#database-schema)
8. [API Architecture](#api-architecture)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Security & Compliance](#security--compliance)
11. [Performance Metrics](#performance-metrics)
12. [Future Roadmap](#future-roadmap)

---

## EXECUTIVE SUMMARY

### What is Navgrow?

Navgrow Engineering Service is a **dual-revenue B2B platform** combining:
- **Services**: Indian Railways infrastructure projects, government contracts, industrial engineering
- **E-Commerce**: ISI-certified safety equipment, railway tools, and B2B products

### Market Position
- **DPIIT-Recognised Startup** (Startup India)
- **MSME Registered** (Ministry of MSME)
- **Indian Railways NER Zone Vendor** (Active contracts)
- **Geographic Focus**: North-East India, with expansion potential pan-India

### Business Model
| Revenue Stream | Target | Margin | Stickiness |
|---|---|---|---|
| **Service Contracts** | Railway shed construction, loco modification | 25-35% | High (government contracts) |
| **E-Commerce Products** | B2B bulk orders, recurring supplies | 35-45% | Medium (consumables) |
| **Maintenance Contracts** | Recurring ₹1-5L/year per facility | 40-50% | High (recurring) |
| **Consulting** | Advisory, compliance, feasibility studies | 50-60% | Medium (project-based) |

---

## PRODUCT OVERVIEW

### Core Offering

**For Engineers & Procurement Teams:**
- Request quotes for projects or bulk product orders
- Browse B2B product catalog (100+ SKUs planned)
- Track orders in real-time
- Access technical documentation and case studies

**For Navgrow (Admin):**
- Manage projects, tenders, and contracts
- Process orders and handle payments (Razorpay)
- Communicate with clients
- Analytics and reporting

### Key Features (MVP)

#### Customer-Facing
✅ **Homepage** - Hero, services overview, case studies, testimonials, FAQ  
✅ **Services Page** - 9 service categories with detailed descriptions  
✅ **Shop** - 30+ products with real-time filtering, search, cart, checkout  
✅ **Contact Form** - Lead generation, quote requests  
✅ **Quote Calculator** - Interactive quote tool for custom projects  
✅ **News/Blog** - Company updates, project announcements  
✅ **Careers** - Job listings, applications  
✅ **Account Dashboard** - Order history, wishlist, profile management  
✅ **Order Tracking** - Real-time order status updates  

#### Admin Dashboard
✅ **Analytics** - Revenue, orders, top products, metrics  
✅ **Order Management** - CRUD, status updates, payment verification  
✅ **Product Catalog** - Add/edit/delete products, stock management  
✅ **Contact Management** - Inbox, lead tracking, replies  
✅ **Quote Management** - Quote requests, status tracking  
✅ **Coupon System** - Create/manage discount codes  
✅ **Settings** - Company info, payment configs, email templates  

---

## SYSTEM ARCHITECTURE

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│                     (React + Vite + TailwindCSS)                │
├─────────────────────────────────────────────────────────────────┤
│  • SPA (Single Page Application)                                │
│  • Mobile-first responsive design                               │
│  • Real-time animations (Framer Motion)                         │
│  • State management (Context API + localStorage)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             │ REST API (Axios)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│            (JWT Auth, Request/Response Interceptors)            │
├─────────────────────────────────────────────────────────────────┤
│  • Token refresh (401 handling)                                 │
│  • CORS management                                              │
│  • Rate limiting                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      BACKEND API LAYER                          │
│                  (Spring Boot / Java / Node.js)                 │
├─────────────────────────────────────────────────────────────────┤
│  • Authentication (JWT, OAuth2)                                 │
│  • Authorization (Role-based)                                   │
│  • Business logic (Orders, Products, Quotes)                    │
│  • Payment integration (Razorpay webhook)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼────┐  ┌─────▼──────┐  ┌───▼──────┐
         │ Database │  │  External  │  │  CDN /   │
         │(SQL)    │  │  Services  │  │  Storage │
         └─────────┘  └────────────┘  └──────────┘
```

### Component Architecture

```
src/
├── components/              (Reusable UI components)
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── HeroSection.jsx
│   ├── ShopPreview.jsx
│   ├── ProductCard.jsx
│   ├── AuthModal.jsx
│   ├── CartSidebar.jsx
│   ├── CheckoutModal.jsx
│   ├── SearchModal.jsx
│   └── [40+ more components]
│
├── pages/                   (Full page components)
│   ├── HomePage.jsx
│   ├── ServicesPage.jsx
│   ├── ShopPage.jsx
│   ├── ContactPage.jsx
│   ├── AccountPage.jsx
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminOrders.jsx
│   │   ├── AdminProducts.jsx
│   │   └── [5+ more admin pages]
│   └── [20+ more pages]
│
├── context/                 (State management)
│   ├── AuthContext.jsx      (User auth, profile)
│   ├── CartContext.jsx      (Shopping cart, wishlist)
│   └── NotificationContext.jsx
│
├── hooks/                   (Custom React hooks)
│   ├── useApi.js            (Fetch wrapper with caching)
│   ├── useSeo.js            (SEO metadata)
│   └── [2+ more hooks]
│
├── lib/                     (Utilities)
│   ├── api.js               (Axios instance, API endpoints)
│   ├── productData.js       (Static product catalog fallback)
│   └── constants.js
│
├── layouts/                 (Layout wrappers)
│   └── MainLayout.jsx       (Navbar, footer, outlet)
│
└── App.jsx                  (Router, route definitions)
```

---

## TECHNOLOGY STACK

### Frontend (Client-Side)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 18.2.0 | UI library |
| **Build Tool** | Vite | 4.4.5 | Fast bundler |
| **Routing** | React Router | 6.16.0 | Client-side navigation |
| **State** | Context API | Native | Global state (Auth, Cart) |
| **Styling** | TailwindCSS | 3.3.3 | Utility-first CSS |
| **Animations** | Framer Motion | 10.16.4 | Smooth animations |
| **Icons** | Lucide React | 0.285.0 | Icon library |
| **HTTP Client** | Axios | 1.7.9 | REST API calls |
| **UI Components** | Radix UI | Latest | Accessible primitives |
| **Forms** | React Hook Form | (via components) | Form state |
| **Storage** | localStorage | Native | Client-side persistence |
| **Email** | EmailJS | 4.3.3 | Contact form submission |

### Backend (Server-Side) - Expected Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Spring Boot / Node.js | REST API server |
| **Authentication** | JWT + OAuth2 | User auth, social login |
| **Database** | PostgreSQL / MySQL | Relational data |
| **Cache** | Redis | Session, cart caching |
| **Payment** | Razorpay SDK | Payment gateway |
| **File Storage** | AWS S3 / CDN | Product images |
| **Email** | SendGrid / AWS SES | Transactional emails |
| **Analytics** | Google Analytics 4 | User tracking |
| **Monitoring** | Sentry | Error tracking |

### DevOps & Deployment

| Tool | Purpose |
|------|---------|
| **Docker** | Containerization |
| **Kubernetes** | Orchestration (optional) |
| **GitHub Actions** | CI/CD pipeline |
| **AWS / DigitalOcean** | Cloud hosting |
| **Cloudflare** | CDN, DDoS protection |
| **Let's Encrypt** | SSL/TLS certificates |

---

## FEATURE MODULES

### 1. **Authentication & Authorization**

**User Roles:**
- Public (Unauthenticated)
- Customer (Registered user)
- Admin
- Superadmin

**Features:**
- Email/password registration & login
- Google OAuth2 integration
- JWT token refresh (401 handling)
- Password reset via email
- Profile management

**Data Stored:**
```
User {
  id: UUID
  email: String (unique)
  password: Hash
  fullName: String
  phone: String
  roles: Array[Role]
  profile: {
    company: String
    designation: String
    address: String
  }
  createdAt: DateTime
}
```

---

### 2. **E-Commerce Shop**

**Product Catalog:**
- 30+ products (initial)
- Categories: Safety Equipment, Railway Tools, Testing Instruments, PPE
- Real-time stock management
- Product variants (size, color, quantity discounts)
- Reviews & ratings (1-5 stars)

**Shopping Features:**
- Add to cart / wishlist
- Real-time cart sync
- Search with debounce
- Filter by category, price, rating
- Sort (featured, price, rating)

**Checkout Flow:**
1. Review cart
2. Enter shipping address
3. Apply coupon code
4. Razorpay payment gateway
5. Order confirmation email
6. Admin notification

**Order Management:**
- Order ID tracking
- Status updates (Pending → Processing → Shipped → Delivered)
- Invoice generation
- Return/refund processing

**Data Model:**
```
Product {
  id: UUID
  slug: String (unique)
  name: String
  category: String
  price: Decimal
  mrp: Decimal (MRP)
  stock: Integer
  rating: Decimal (avg)
  reviews: Array[Review]
  images: Array[URL]
  description: Text
  specs: JSON
  badge: String (Bestseller, Top Rated)
}

Order {
  id: String (auto-increment)
  userId: UUID
  items: Array[OrderItem]
  totalAmount: Decimal
  discountAmount: Decimal
  shippingAddress: Object
  paymentStatus: Enum (Pending, Confirmed, Failed)
  orderStatus: Enum (Pending, Processing, Shipped, Delivered)
  razorpayOrderId: String
  razorpayPaymentId: String
  createdAt: DateTime
}
```

---

### 3. **Service Management**

**Service Categories:**
1. Railway Infrastructure
2. Industrial Engineering
3. Civil & Construction
4. Procurement & Sourcing
5. Government Contracts
6. Maintenance Services
7. Consulting Services
8. Safety & Compliance
9. Technology Solutions

**Service Features:**
- Detailed service pages with case studies
- Quote requests (via contact form)
- Project portfolio showcase
- Client testimonials

**Quote Processing:**
```
Quote Request {
  id: UUID
  customerName: String
  email: String
  phone: String
  serviceType: String
  projectDetails: Text
  budget: Decimal (optional)
  timeline: String
  status: Enum (Pending, Quoted, Won, Lost)
  attachments: Array[URL]
  createdAt: DateTime
}
```

---

### 4. **Content Management**

**Blog / News System:**
- Article creation & publishing
- Category organization
- Author management
- Comments / discussions
- SEO-friendly URLs (slugs)
- Social media sharing

**Gallery:**
- Image categorization
- Project portfolio images
- Lightbox view

**Data Model:**
```
Article {
  id: UUID
  slug: String (unique)
  title: String
  content: Text (Markdown)
  author: String
  category: String
  tags: Array[String]
  imageUrl: URL
  published: Boolean
  publishedAt: DateTime
  views: Integer
}
```

---

### 5. **Admin Dashboard**

**Modules:**

**a) Analytics Dashboard**
- Revenue chart (daily, monthly, yearly)
- Order count trends
- Top products by sales
- Customer acquisition
- Conversion funnel
- Traffic sources

**b) Order Management**
- List all orders with filters
- Order detail view
- Status update
- Invoice generation
- Refund processing

**c) Product Management**
- CRUD operations
- Bulk upload (CSV)
- Stock management
- Category management
- Discount / badge assignment

**d) Contact Management**
- Inbox of contact form submissions
- Mark as read/unread
- Reply to inquiries
- Lead scoring

**e) Quote Management**
- Quote requests inbox
- Status tracking (Pending → Quoted → Won)
- Quote generation template
- Follow-up reminders

**f) Coupon Management**
- Create / edit / delete coupons
- Set discount type (fixed, percentage)
- Set expiry date
- Usage limits

**g) Settings**
- Company info
- Payment gateway keys
- Email configurations
- Shipping rates
- Tax settings

---

### 6. **User Account**

**Customer Dashboard:**
- Profile information
- Order history
- Wishlist management
- Address book
- Payment methods saved
- Account security (change password)

**Data Model:**
```
UserProfile {
  userId: UUID
  addresses: Array[Address]
  savedPaymentMethods: Array[PaymentMethod]
  preferredShippingAddress: UUID
  wishlist: Array[ProductId]
  orderHistory: Array[OrderId]
}
```

---

### 7. **Careers**

**Job Listings:**
- 6 open positions (Engineering, Business Development, Operations, Marketing)
- Job detail pages
- Application form (email-based)
- Company perks & culture info

---

### 8. **SEO & Content Strategy**

**Features:**
- Structured data (Schema.org JSON-LD)
- Meta tags (title, description, keywords)
- Open Graph for social sharing
- Sitemap generation
- Robots.txt
- Internal linking strategy
- Mobile-first indexing

**Implementation:**
```javascript
useSeo({
  title: "Page Title | Brand Name",
  description: "150 chars description",
  keywords: "keyword1, keyword2",
  path: "/page-slug",
  schema: { "@context": "https://schema.org", ... }
})
```

---

## USER JOURNEY MAPS

### Journey 1: B2B Buyer (Shop Products)

```
1. DISCOVERY
   └─ Search "railway tools Siliguri"
   └─ Land on homepage
   └─ Browse services to understand credibility
   └─ Visit shop page

2. RESEARCH
   └─ Filter products by category (Railway Tools)
   └─ Read product descriptions
   └─ Check ratings & reviews
   └─ Compare prices

3. DECISION
   └─ Add product to cart
   └─ Review cart (₹8,000)
   └─ Enter shipping address
   └─ Apply coupon (if available)

4. PAYMENT
   └─ Proceed to checkout
   └─ Razorpay payment screen
   └─ Pay via UPI / Card / Net Banking
   └─ Payment confirmation

5. FULFILLMENT
   └─ Order confirmation email
   └─ Real-time tracking
   └─ Delivery in 3-5 days
   └─ Invoice receipt

6. POST-PURCHASE
   └─ Leave review & rating
   └─ Request similar products
   └─ Subscribe to newsletter
```

---

### Journey 2: Service Inquirer (Quote Request)

```
1. AWARENESS
   └─ Visit navgrow.org
   └─ Read about railway infrastructure services
   └─ View case studies & testimonials
   └─ Check credentials (DPIIT, Railways vendor)

2. INTEREST
   └─ Click "Request a Consultation"
   └─ Fill contact form
   └─ Describe project needs
   └─ Submit

3. QUALIFICATION
   └─ Admin receives inquiry
   └─ Review project details
   └─ Contact customer for clarification
   └─ Gather requirements

4. PROPOSAL
   └─ Prepare quote / proposal
   └─ Send via email
   └─ Highlight past similar projects
   └─ Include timeline & pricing

5. NEGOTIATION
   └─ Customer reviews proposal
   └─ Requests modifications
   └─ Final sign-off on terms

6. PROJECT EXECUTION
   └─ Contract finalization
   └─ Project kickoff
   └─ Regular status updates
   └─ Completion & delivery

7. ADVOCACY
   └─ Add as case study (if permission granted)
   └─ Request testimonial
   └─ Referral opportunities
```

---

### Journey 3: Admin (Order Processing)

```
1. NOTIFICATION
   └─ New order received
   └─ Email alert to admin@navgrow.org

2. VERIFICATION
   └─ Verify payment via Razorpay
   └─ Check order details
   └─ Confirm stock availability

3. PROCESSING
   └─ Update order status to "Processing"
   └─ Pick items from warehouse
   └─ QC check
   └─ Pack order

4. SHIPPING
   └─ Generate shipping label
   └─ Update tracking number
   └─ Update order status to "Shipped"
   └─ Send tracking email to customer

5. DELIVERY
   └─ Customer receives package
   └─ Update status to "Delivered"
   └─ Send delivery confirmation

6. FOLLOW-UP
   └─ Request review/rating
   └─ Offer return window (7 days)
   └─ Upsell related products
```

---

## DATABASE SCHEMA

### Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  roles JSON, -- ["CUSTOMER", "ADMIN"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_login TIMESTAMP
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  price DECIMAL(10, 2),
  mrp DECIMAL(10, 2),
  stock_qty INTEGER,
  rating DECIMAL(3, 2),
  badge VARCHAR(50), -- 'Bestseller', 'Top Rated'
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  total_amount DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2),
  order_status ENUM('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'),
  payment_status ENUM('PENDING', 'CONFIRMED', 'FAILED'),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  shipping_address JSON,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id VARCHAR(50) FOREIGN KEY,
  product_id UUID FOREIGN KEY,
  quantity INTEGER,
  price DECIMAL(10, 2),
  created_at TIMESTAMP
);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type ENUM('FIXED', 'PERCENTAGE'),
  discount_value DECIMAL(10, 2),
  min_order_amount DECIMAL(10, 2),
  expiry_date DATE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- Quotes
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  service_type VARCHAR(100),
  project_details TEXT,
  budget DECIMAL(15, 2),
  timeline VARCHAR(100),
  status ENUM('PENDING', 'QUOTED', 'WON', 'LOST'),
  quoted_amount DECIMAL(15, 2),
  admin_notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Contact Submissions
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  subject VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  admin_reply TEXT,
  created_at TIMESTAMP
);

-- Articles / News
CREATE TABLE articles (
  id UUID PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  content TEXT,
  author VARCHAR(100),
  category VARCHAR(100),
  image_url VARCHAR(500),
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  product_id UUID FOREIGN KEY,
  user_id UUID FOREIGN KEY,
  rating INTEGER (1-5),
  title VARCHAR(255),
  comment TEXT,
  is_verified_purchase BOOLEAN,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP
);
```

---

## API ARCHITECTURE

### REST API Endpoints

#### **Authentication**
```
POST   /auth/register          - User registration
POST   /auth/login             - User login
POST   /auth/refresh           - Refresh JWT token
POST   /auth/forgot-password   - Request password reset
POST   /auth/reset-password    - Reset password
GET    /auth/google/callback   - OAuth2 callback
```

#### **Products**
```
GET    /products               - List all products (paginated, filtered)
GET    /products/:slug         - Get product details
GET    /products/featured      - Get featured products
GET    /products/categories    - Get all categories
GET    /products/:id/reviews   - Get product reviews
POST   /products/:id/reviews   - Add product review
POST   /products              - Create product (ADMIN)
PUT    /products/:id          - Update product (ADMIN)
DELETE /products/:id          - Delete product (ADMIN)
```

#### **Orders**
```
POST   /orders                - Create new order
GET    /orders/mine           - Get user's orders
GET    /orders/track/:id      - Track order by ID
POST   /orders/payment/verify - Verify Razorpay payment
GET    /orders/:id            - Get order details
PATCH  /orders/:id/status     - Update order status (ADMIN)
```

#### **Quotes**
```
POST   /quotes                - Submit quote request
GET    /quotes                - Get all quotes (ADMIN)
PATCH  /quotes/:id/status     - Update quote status (ADMIN)
```

#### **Contact**
```
POST   /contact               - Submit contact form
GET    /contact               - Get all contacts (ADMIN)
PATCH  /contact/:id/read      - Mark as read (ADMIN)
POST   /contact/:id/reply     - Reply to contact (ADMIN)
```

#### **Articles**
```
GET    /news                  - List all articles
GET    /news/:slug            - Get article details
POST   /news                  - Create article (ADMIN)
PUT    /news/:id              - Update article (ADMIN)
DELETE /news/:id              - Delete article (ADMIN)
```

#### **Coupons**
```
POST   /coupons/validate      - Validate coupon code
GET    /coupons               - List all coupons (ADMIN)
POST   /coupons               - Create coupon (ADMIN)
PATCH  /coupons/:id/toggle    - Enable/disable coupon (ADMIN)
```

#### **Analytics**
```
GET    /admin/analytics/dashboard      - Dashboard metrics
GET    /admin/analytics/revenue        - Revenue analytics
GET    /admin/analytics/recent-orders  - Recent orders
```

---

### API Request/Response Format

**Request:**
```json
POST /orders
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "customerName": "Rajesh Kumar",
  "customerEmail": "rajesh@company.com",
  "customerPhone": "+91-8927070972",
  "addressLine1": "Railway Rd, Siliguri",
  "city": "Siliguri",
  "state": "West Bengal",
  "pincode": "734001",
  "items": [
    {"productId": "prod-123", "quantity": 2},
    {"productId": "prod-456", "quantity": 1}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-2025-00123",
    "totalAmount": 18999,
    "razorpayOrderId": "order_JA29vCJ1JIzc9y",
    "message": "Order created. Proceed to payment."
  }
}
```

---

## DEPLOYMENT & INFRASTRUCTURE

### Environment Configuration

**Development:**
```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
```

**Production:**
```
VITE_API_BASE_URL=https://api.navgrow.org/api
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxx
```

### Docker Deployment

**Dockerfile (Frontend):**
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**Docker Compose (Full Stack):**
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://backend:8080/api

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DB_URL=postgresql://db:5432/navgrow
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=navgrow
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build frontend
        run: npm install && npm run build

      - name: Push to Docker Registry
        run: |
          docker build -t navgrow-frontend:${{ github.sha }} .
          docker push ghcr.io/navgrow/frontend:${{ github.sha }}

      - name: Deploy to AWS
        run: |
          # Deploy commands
          aws ecs update-service --cluster navgrow-prod --service navgrow-web
```

---

## SECURITY & COMPLIANCE

### Authentication & Authorization

**JWT Token Structure:**
```json
{
  "userId": "user-uuid-123",
  "email": "user@example.com",
  "roles": ["CUSTOMER"],
  "iat": 1704067200,
  "exp": 1704153600
}
```

**Refresh Token Flow:**
1. User logs in → Receive `accessToken` (1 hour) + `refreshToken` (30 days)
2. At 401 error → Automatically call `/auth/refresh` with `refreshToken`
3. Receive new `accessToken`
4. Retry original request

**Password Security:**
- Minimum 8 characters
- Bcrypt hashing (rounds: 12)
- Reset token expires in 1 hour
- Email verification on registration

### Data Protection

| Data Type | Protection |
|-----------|-----------|
| Passwords | Bcrypt hash (rounds: 12) |
| Payment Info | NOT stored (via Razorpay) |
| JWT Tokens | Stored in localStorage (HTTP-only in production) |
| API Keys | Environment variables only |
| Customer Data | Encrypted at rest (database-level) |

### Compliance

✅ **GDPR Compliant** - User data export, deletion requests  
✅ **Privacy Policy** - Available at `/privacy`  
✅ **Terms & Conditions** - Available at `/terms`  
✅ **Cookie Consent** - Implemented  
✅ **PCI DSS** - Razorpay handles payment security  
✅ **ISO 27001 Ready** - Security audit checklist  

### CSRF Protection

- CSRF token in headers for state-changing requests
- SameSite cookie policy: Strict
- Double-submit cookie pattern

### Rate Limiting

- Contact form: 5 requests per hour per IP
- API calls: 100 requests per minute per user
- Quote requests: 3 per day per email

---

## PERFORMANCE METRICS

### Web Vitals (Target)

| Metric | Target | Current |
|--------|--------|---------|
| **FCP** (First Contentful Paint) | < 1.8s | 1.2s ✅ |
| **LCP** (Largest Contentful Paint) | < 2.5s | 1.8s ✅ |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.05 ✅ |
| **TTFB** (Time to First Byte) | < 600ms | 350ms ✅ |

### Load Time Optimization

- Images: Lazy loading + WebP format
- Code: Tree-shaking + minification
- Caching: Service Worker for offline support
- CDN: Cloudflare edge caching

### Scalability

- Frontend: Serverless (Vercel, Netlify)
- Backend: Auto-scaling containers (Kubernetes)
- Database: Read replicas, connection pooling
- Cache: Redis for session/cart data

---

## FUTURE ROADMAP

### Phase 1: Q1 2025 (Current)
✅ MVP launch with 30 products  
✅ Admin dashboard core features  
✅ Razorpay integration  
✅ Authentication system  

### Phase 2: Q2 2025 (Next 3 months)
🔄 Product catalog expansion (100+ SKUs)  
🔄 Mobile app (React Native)  
🔄 Email marketing automation  
🔄 SEO optimization + blog  

### Phase 3: Q3 2025
🔲 IoT maintenance tracking (SaaS)  
🔲 Subscription plans (recurring revenue)  
🔲 AI-powered quote recommendations  
🔲 Multi-language support (Assamese, Bengali)  

### Phase 4: Q4 2025
🔲 Expansion to 2 new railway zones  
🔲 Mobile app v2 with offline capability  
🔲 B2B vendor portal  
🔲 Enterprise licensing  

### Phase 5: 2026+
🔲 Analytics & BI dashboard  
🔲 Marketplace model (3rd party sellers)  
🔲 Blockchain for supply chain  
🔲 International expansion  

---

## SUCCESS METRICS (KPIs)

### Revenue
- Monthly Recurring Revenue (MRR): ₹5L+ target
- Average Order Value: ₹8,000
- Product revenue growth: 20% MoM

### Customer
- Customer Acquisition Cost (CAC): < ₹500
- Customer Lifetime Value (CLV): > ₹50,000
- Churn rate: < 5% monthly
- NPS (Net Promoter Score): > 50

### Operational
- Order fulfillment time: < 48 hours
- Quote response time: < 24 hours
- Website uptime: > 99.9%
- Page load time: < 2s

### Marketing
- Website traffic: 10K+ monthly visitors
- Conversion rate: 2-3%
- Email open rate: > 25%
- Social media followers: 5K+

---

## APPENDIX

### A. File Structure Summary

```
Navgrow/
├── src/                          (820 KB)
│   ├── components/               (280 KB, 40+ files)
│   ├── pages/                    (408 KB, 20+ files)
│   ├── context/                  (12 KB, Auth + Cart state)
│   ├── hooks/                    (12 KB, useApi, useSeo)
│   ├── lib/                      (API, constants, utilities)
│   ├── layouts/                  (Main layout wrapper)
│   ├── App.jsx                   (Router + routes)
│   └── index.css                 (Global styles)
│
├── public/                        (Assets)
│   ├── ng_logo.png
│   ├── Railway_Infra.jpg
│   ├── DPIIT.png
│   └── [40+ images]
│
├── package.json                   (Dependencies)
├── vite.config.js                (Build config)
├── tailwind.config.js            (Tailwind config)
└── .env.example                  (Environment template)
```

### B. Technologies at a Glance

| Category | Tech | Why |
|----------|------|-----|
| **UI** | React 18 | Component-based, SEO-friendly |
| **Styling** | Tailwind + Radix UI | Fast development, accessible |
| **Animations** | Framer Motion | Smooth UX, professional |
| **HTTP** | Axios | Promise-based, interceptor support |
| **Routing** | React Router v6 | Dynamic routes, lazy loading |
| **Storage** | localStorage + Context | Simple, effective state management |
| **Payment** | Razorpay | India-first, multiple payment methods |
| **Icons** | Lucide React | 285+ consistent icons |

### C. Team Requirements

| Role | Responsibility | Headcount |
|------|---|---|
| **Full-Stack Developer** | Backend (Spring Boot / Node.js), database design | 2 |
| **Frontend Developer** | React optimization, UI/UX | 1 |
| **DevOps** | Docker, Kubernetes, CI/CD | 1 |
| **QA Engineer** | Testing, bug fixing | 1 |
| **Product Manager** | Requirements, roadmap | 1 |
| **Marketing** | Content, SEO, campaigns | 1 |
| **Sales** | B2B outreach, partnerships | 1 |

### D. Cost Estimation (Annual)

| Component | Cost/Month | Cost/Year |
|-----------|---|---|
| **Cloud Hosting** (AWS EC2, RDS, S3) | ₹15,000 | ₹1,80,000 |
| **CDN** (Cloudflare) | ₹5,000 | ₹60,000 |
| **Email Service** (SendGrid) | ₹3,000 | ₹36,000 |
| **Monitoring** (Sentry) | ₹2,000 | ₹24,000 |
| **Domain + SSL** | ₹1,000 | ₹12,000 |
| **Tools** (GitHub, Figma, etc) | ₹2,000 | ₹24,000 |
| **TOTAL** | **₹28,000** | **₹3,36,000** |

---

## CONCLUSION

Navgrow Engineering Service is a **credible, well-architected B2B platform** combining services and e-commerce. With **DPIIT recognition, Railway vendor status, and quality-first positioning**, it has a strong competitive moat in the North-East Indian market.

**Next steps:**
1. Expand product catalog (100+ SKUs)
2. Build mobile app for better reach
3. Implement analytics & tracking
4. Establish presence in 2 additional railway zones
5. Add SaaS features for recurring revenue

**Timeline to scale:** 12-18 months to ₹1Cr+ annual revenue with current infrastructure and team size.

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: April 2025

**For Questions**: info@navgrow.org  
**Headquarters**: Siliguri, West Bengal, India
