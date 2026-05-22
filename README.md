# 🍟 HostelBite — Hostel Snack Delivery System

A premium, full-stack e-commerce platform designed for hostel snack delivery with three role-based dashboards: **Customer**, **Seller**, and **Admin**. Built with React + Node.js + MongoDB + Socket.io, it offers real-time order updates, secure token-based authentication, password recovery, dynamic performance optimizations, and role-based access control (RBAC).

---

## 📁 Project Structure

```
hostel-snacks/
├── package.json                   # Root package manager & orchestration scripts
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection setup
│   ├── middleware/
│   │   ├── auth.js                # JWT validation & RBAC (Role-Based Access Control)
│   │   ├── performance.js         # Custom response timer + Brotli/Gzip compression
│   │   └── rateLimiter.js         # Custom in-memory IP rate limiter
│   ├── models/
│   │   ├── User.js                # User model (Customer/Seller/Admin)
│   │   ├── Product.js             # Product model with category & availability
│   │   ├── Cart.js                # Shopping cart model per user
│   │   └── Order.js               # Order model with transaction & status history
│   ├── routes/
│   │   ├── admin.js               # Admin dashboard statistics & user/product control
│   │   ├── auth.js                # Login, register, profile, password recovery/change
│   │   ├── cart.js                # Cart additions, quantity updates & clearances
│   │   ├── orders.js              # Order placement, cancellations, & status updates
│   │   └── products.js            # Product retrieval, search, caching, & CRUD
│   ├── utils/
│   │   ├── cache.js               # Lightweight memory-cache helper for fast queries
│   │   ├── query.js               # Safe query projection, paging, & pricing helpers
│   │   └── sendEmail.js           # Password reset email delivery via Resend API
│   ├── scripts/
│   │   ├── create-admin.js        # Command-line admin account creator
│   │   ├── seed.js                # Seed script with mock products & users
│   │   └── sync-indexes.js        # Script to synchronize MongoDB database indexes
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Express + Socket.io Server & HTTP security headers
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── ProductCard.jsx     # Reusable animated snack card
    │   ├── context/
    │   │   ├── AuthContext.jsx     # Auth state, session sync, login/logout, & reset
    │   │   ├── CartContext.jsx     # Cart state, modifiers, and backend API sync
    │   │   └── ThemeContext.jsx    # Dark mode state provider & theme class toggler
    │   ├── hooks/
    │   │   └── useSocket.js        # Socket.io connection hook and event listeners
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── LoginPage.jsx
    │   │   │   ├── RegisterPage.jsx
    │   │   │   ├── ForgotPasswordPage.jsx  # Request password reset link
    │   │   │   └── ResetPasswordPage.jsx   # Input new password using token from mail
    │   │   ├── customer/
    │   │   │   ├── CustomerLayout.jsx      # Navigation header & Customer layout
    │   │   │   ├── HomePage.jsx
    │   │   │   ├── ProductsPage.jsx
    │   │   │   ├── CartPage.jsx
    │   │   │   ├── CheckoutPage.jsx        # Room details, phone, COD, or UPI (with QR)
    │   │   │   ├── OrderSuccessPage.jsx
    │   │   │   ├── OrderHistoryPage.jsx    # List of orders with live status updates
    │   │   │   ├── OrderDetailPage.jsx     # Detailed status timeline & item list
    │   │   │   └── ProfilePage.jsx         # Profile edit & current password change
    │   │   ├── seller/
    │   │   │   ├── SellerLayout.jsx        # Sidebar navigation for sellers
    │   │   │   ├── SellerDashboard.jsx     # Visual statistics & product inventory count
    │   │   │   ├── SellerOrders.jsx        # Manage & transition customer orders
    │   │   │   ├── SellerProducts.jsx      # List products and toggle active status
    │   │   │   └── SellerAddProduct.jsx    # Add / update product fields (with image url)
    │   │   └── admin/
    │   │       ├── AdminLayout.jsx         # Sidebar navigation for admins
    │   │       ├── AdminDashboard.jsx      # Global revenue metrics and order lists
    │   │       ├── AdminUsers.jsx          # Edit roles & toggle account active status
    │   │       ├── AdminOrders.jsx         # Track all orders placed on the system
    │   │       └── AdminProducts.jsx       # Global product catalog dashboard
    │   ├── utils/
    │   │   ├── api.js              # Axios instance configured with JWT & auto-logout
    │   │   └── helpers.js          # Currency formatting, dates, & color tags
    │   ├── App.jsx                 # Route configurations, guards, & lazy load wrappers
    │   ├── main.jsx
    │   └── index.css               # Design system baseline & utility definitions
    ├── index.html
    ├── vite.config.js              # Vite config with path proxying for /api & /socket.io
    ├── tailwind.config.js
    └── package.json
```

---

## ⚙️ Prerequisites

Before launching, ensure you have the following installed on your machine:
- **Node.js** (v18.x or higher)
- **MongoDB** (Local instance or MongoDB Atlas account)
- **NPM** or **Yarn**

---

## 🚀 Setup & Execution Guide

### 1. Root Installation & Development Command
We provide root commands to simplify installing and starting the entire stack concurrently:

```bash
# Clone the repository
git clone <repository-url>
cd hostel-snacks

# Install all dependencies for both backend and frontend projects
npm run install:all

# Start both frontend and backend concurrently in development mode
npm run dev
```

### 2. Manual Installation (Optional)
If you prefer running or installing them individually:

**Backend Setup:**
```bash
cd backend
npm install
npm run dev
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Environment Configuration

Create a `.env` file inside the `backend/` directory by copying `.env.example`:

```bash
cd backend
cp .env.example .env
```

Configure the environment variables:

| Variable | Description | Recommended/Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Mode of operation | `development` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://localhost:27017/hostel-snacks` |
| `JWT_SECRET` | Secret key for JWT signing | *Choose a strong string* |
| `JWT_EXPIRE` | JWT duration | `7d` |
| `ADMIN_EMAIL` | Admin login seed email | `admin@hostel.com` |
| `ADMIN_PASSWORD` | Admin login seed password | `Admin@123` |
| `UPI_ID` | Store payment UPI address | `yourupi@upi` |
| `UPI_NAME` | Payee name displayed in checkout | `Hostel Snacks` |
| `UPI_QR_URL` | Image URL of payment QR code | *URL to your QR asset* |
| `FRONTEND_URL` | URL of the frontend (for CORS check) | `http://localhost:5173` |
| `RESEND_API_KEY` | Resend API Key for sending emails | *Your Resend API Token* |
| `FROM_EMAIL` | Sender email address | `onboarding@resend.dev` |
| `FROM_NAME` | Sender name shown in mail client | `HostelBite` |
| `SLOW_REQUEST_MS` | Warning threshold for API latency | `750` |
| `AUTH_RATE_LIMIT` | Maximum auth requests per 15-minute window | `40` |

---

## 🗃️ Database Initialization & Sync

### Seed Demo Accounts & Products
Populate the database with mock items, users, and pre-set credentials:
```bash
# Run from the root directory
npm run seed

# Or run directly inside backend/
cd backend
npm run seed
```

This creates the following pre-configured credentials:
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@hostel.com` | `Admin@123` |
| **Seller** | `seller@hostel.com` | `Seller@123` |
| **Customer** | `student@hostel.com` | `Student@123` |

### Sync MongoDB Indexes
Sync schema indexes with MongoDB (e.g. for unique fields, optimizations):
```bash
cd backend
npm run sync-indexes
```

---

## 🌐 API Reference

### 1. Healthcheck
- `GET /api/health` — Checks if the backend API server is alive.

### 2. Auth Routes (`/api/auth`)
- `POST /register` — Register a customer account (Public).
- `POST /login` — Authenticate and retrieve a JWT (Public).
- `GET /me` — Retrieve active user details (Private).
- `PUT /profile` — Update user profile details (Private).
- `PUT /change-password` — Change password inside profile (Private).
- `POST /forgot-password` — Requests a password reset link (Public). Sends an email with a secure token using Resend.
- `PUT /reset-password/:token` — Validates the token and updates the password (Public).

### 3. Products (`/api/products`)
- `GET /` — List and query products with pagination & search filter (Public, Cached).
- `GET /top` — Retrieve top selling items (Public).
- `GET /:id` — Retrieve a single product detail (Public).
- `POST /` — Add a new product (Seller/Admin).
- `PUT /:id` — Update product details or availability (Seller/Admin).
- `DELETE /:id` — Remove a product (Seller/Admin).
- `GET /seller/my` — Get products created by the logged-in seller (Seller/Admin).

### 4. Cart (`/api/cart`)
- `GET /` — Retrieve current customer's cart (Customer).
- `POST /add` — Add a product to the cart (Customer).
- `PUT /update` — Modify cart item quantities (Customer).
- `DELETE /remove/:id` — Remove item from cart (Customer).
- `DELETE /clear` — Empty the entire cart (Customer).

### 5. Orders (`/api/orders`)
- `POST /` — Place order (room, phone, payment type, optional coupon) (Customer).
- `GET /my` — List all orders belonging to the customer (Customer).
- `GET /:id` — Get single order details (All roles, access protected).
- `GET /seller/all` — List all orders for fulfillment (Seller/Admin).
- `PUT /:id/status` — Modify order status: `Pending` → `Accepted` → `Preparing` → `Dispatched` → `Delivered` (Seller/Admin).
- `PUT /:id/cancel` — Cancel an order (Customer, only if pending).

### 6. Admin Control (`/api/admin`)
- `GET /stats` — Retrieve revenue charts, sales metrics, and product breakdown (Admin).
- `GET /users` — List all user accounts (Admin).
- `PUT /users/:id` — Edit user details or toggle account active/inactive state (Admin).
- `DELETE /users/:id` — Remove a user account (Admin).
- `POST /sellers` — Create a new verified Seller account directly (Admin).
- `GET /orders` — Global order tracking log (Admin).
- `GET /products` — Global product management (Admin).

---

## ⚡ Performance, Caching & Security Features

We implemented optimized architectures to ensure efficiency, fast load times, and resilience against attacks:

1. **Lightweight In-Memory Caching (`backend/utils/cache.js`)**
   - Eliminates repetitive DB queries for heavy API calls (e.g. products catalogue).
   - TTL (Time-To-Live) cache auto-evades expired entries.
   - Clears queries selectively on product updates or deletes to maintain data consistency.

2. **Gzip & Brotli Compression (`backend/middleware/performance.js`)**
   - Automatically detects client support headers (`br` or `gzip`) and compresses payloads greater than `1024` bytes.
   - Boosts frontend page loading speed by minimizing network transit size.

3. **Latency Profiler (`backend/middleware/performance.js`)**
   - Injected custom timing logs that append a `X-Response-Time` header to every server response.
   - Automatically logs warnings (`[slow-api]`) for requests taking longer than the configured `SLOW_REQUEST_MS` threshold (default `750ms`).

4. **IP Rate Limiter (`backend/middleware/rateLimiter.js`)**
   - Custom memory-bucket rate-limiting middleware that blocks brute-force authentication attempts.
   - Responds with `429 Too Many Requests` when limits are exceeded on Auth routes.

5. **Server Hardening Headers**
   - Disables standard Express fingerprints (`x-powered-by`) to prevent technical profiling.
   - Sets secure request properties like `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 🔌 Socket.io Real-Time Event Communication

HostelBite uses WebSockets to bridge customer updates and seller actions instantly without client polling:

### Rooms & Channels
- **`user_<userId>`**: Private room joined by each authenticated client.
- **`sellers`**: Management room joined by verified Sellers and Admins.

### Event Protocol
- **`join`** (Client → Server)
  - Sent on frontend socket initialization to join the specific role/id channels.
- **`new_order`** (Server → Sellers)
  - Broadcasted to the `sellers` room immediately when a customer submits a snack purchase. Sets off sound/visual dashboard alerts.
- **`order_status_update`** (Server → Customer Room)
  - Triggered when a seller updates an order's status. Displays instant desktop toast notifications on the customer's page and updates their Order History / Order Detail components dynamically.

---

## 🎫 Promo Coupons & QR Checkout

- **Promo Codes**: Includes pre-configured discounts like `HOSTEL10` (10% off) and `FIRST20` (20% off).
- **Payment Modes**: Supports Cash on Delivery (COD) or instant UPI checkout.
- **QR Payment**: Dynamic QR code rendering displayed on the Checkout step based on `UPI_QR_URL`, allowing users to pay instantly using any UPI app (GPay, PhonePe, Paytm, etc.).

---

## 🚀 Deployment Guide

### Deploying Backend to Render / Railway
1. Push code to your GitHub repository.
2. Link the repository to your Render/Railway dashboard.
3. Configure the environment variables in the dashboard corresponding to your local `.env`.
4. Ensure the **Build Command** is set to `npm install` (in backend subdirectory) and the **Start Command** is `npm start`.
5. Point the `MONGO_URI` connection string to your online cluster (e.g. MongoDB Atlas).

### Deploying Frontend to Vercel
1. Import the project on Vercel.
2. Override the Build directory to build the `/frontend` subfolder.
3. Configure the environment variable:
   ```env
   VITE_API_URL=https://your-backend-api.onrender.com
   ```
4. Vercel routes are pre-configured in `frontend/vercel.json` to route all page requests back to index.html, preventing router 404 errors on page refresh.

---

Made with ❤️ for hostelers 🍟
