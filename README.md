# 🍟 HostelBite — Hostel Snack Delivery System

A full-stack e-commerce platform for hostel snack delivery with three role-based panels: **Customer**, **Seller**, and **Admin**. Built with React + Node.js + MongoDB + Socket.io.

---

## 📁 Project Structure

```
hostel-snacks/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── middleware/
│   │   └── auth.js                # JWT auth + RBAC middleware
│   ├── models/
│   │   ├── User.js                # User model (customer/seller/admin)
│   │   ├── Product.js             # Product model
│   │   ├── Cart.js                # Cart model
│   │   └── Order.js               # Order model
│   ├── routes/
│   │   ├── auth.js                # Register, login, profile
│   │   ├── products.js            # Product CRUD
│   │   ├── cart.js                # Cart operations
│   │   ├── orders.js              # Order placement & status
│   │   └── admin.js               # Admin-only routes
│   ├── scripts/
│   │   └── seed.js                # Seed demo data
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Express + Socket.io server
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx     # Auth state (login/logout/register)
    │   │   ├── CartContext.jsx     # Cart state + API calls
    │   │   └── ThemeContext.jsx    # Dark mode toggle
    │   ├── hooks/
    │   │   └── useSocket.js        # Socket.io hook
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── LoginPage.jsx
    │   │   │   └── RegisterPage.jsx
    │   │   ├── customer/
    │   │   │   ├── CustomerLayout.jsx
    │   │   │   ├── HomePage.jsx
    │   │   │   ├── ProductsPage.jsx
    │   │   │   ├── CartPage.jsx
    │   │   │   ├── CheckoutPage.jsx
    │   │   │   ├── OrderSuccessPage.jsx
    │   │   │   ├── OrderHistoryPage.jsx
    │   │   │   ├── OrderDetailPage.jsx
    │   │   │   └── ProfilePage.jsx
    │   │   ├── seller/
    │   │   │   ├── SellerLayout.jsx
    │   │   │   ├── SellerDashboard.jsx
    │   │   │   ├── SellerOrders.jsx
    │   │   │   ├── SellerProducts.jsx
    │   │   │   └── SellerAddProduct.jsx
    │   │   └── admin/
    │   │       ├── AdminLayout.jsx
    │   │       ├── AdminDashboard.jsx
    │   │       ├── AdminUsers.jsx
    │   │       ├── AdminOrders.jsx
    │   │       └── AdminProducts.jsx
    │   ├── utils/
    │   │   ├── api.js              # Axios instance with JWT interceptor
    │   │   └── helpers.js          # Formatters, status labels, etc.
    │   ├── App.jsx                 # Routes + guards
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## ⚙️ Prerequisites

- **Node.js** v18+
- **MongoDB** (local) or MongoDB Atlas (free tier)
- **npm** or **yarn**

---

## 🚀 Local Setup (Step-by-Step)

### 1. Clone / Copy the project

```bash
# If using git
git clone <repo-url>
cd hostel-snacks
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/hostel-snacks
JWT_SECRET=supersecretkey_change_this_in_production
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@hostel.com
ADMIN_PASSWORD=Admin@123
UPI_ID=yourupi@upi
UPI_NAME=Hostel Snacks
FRONTEND_URL=http://localhost:5173
```

### 3. Seed the Database

```bash
cd backend
node scripts/seed.js
```

This creates:
| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Admin    | admin@hostel.com       | Admin@123   |
| Seller   | seller@hostel.com      | Seller@123  |
| Customer | student@hostel.com     | Student@123 |

### 4. Start the Backend

```bash
# Development (with nodemon auto-restart)
npm run dev

# Production
npm start
```

Backend runs at: `http://localhost:5000`

### 5. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🌐 API Reference

### Auth
| Method | Endpoint              | Access  | Description          |
|--------|-----------------------|---------|----------------------|
| POST   | /api/auth/register    | Public  | Register customer    |
| POST   | /api/auth/login       | Public  | Login any role       |
| GET    | /api/auth/me          | Private | Get profile          |
| PUT    | /api/auth/profile     | Private | Update profile       |
| PUT    | /api/auth/change-password | Private | Change password  |

### Products
| Method | Endpoint                | Access         | Description      |
|--------|-------------------------|----------------|------------------|
| GET    | /api/products           | Public         | List (search/filter) |
| GET    | /api/products/top       | Public         | Top selling      |
| GET    | /api/products/:id       | Public         | Single product   |
| POST   | /api/products           | Seller/Admin   | Create product   |
| PUT    | /api/products/:id       | Seller/Admin   | Update product   |
| DELETE | /api/products/:id       | Seller/Admin   | Delete product   |
| GET    | /api/products/seller/my | Seller/Admin   | My products      |

### Cart
| Method | Endpoint              | Access   | Description      |
|--------|-----------------------|----------|------------------|
| GET    | /api/cart             | Customer | Get cart         |
| POST   | /api/cart/add         | Customer | Add item         |
| PUT    | /api/cart/update      | Customer | Update quantity  |
| DELETE | /api/cart/remove/:id  | Customer | Remove item      |
| DELETE | /api/cart/clear       | Customer | Clear cart       |

### Orders
| Method | Endpoint                  | Access         | Description         |
|--------|---------------------------|----------------|---------------------|
| POST   | /api/orders               | Customer       | Place order         |
| GET    | /api/orders/my            | Customer       | My orders           |
| GET    | /api/orders/:id           | All (own)      | Single order        |
| GET    | /api/orders/seller/all    | Seller/Admin   | All orders          |
| PUT    | /api/orders/:id/status    | Seller/Admin   | Update status       |
| PUT    | /api/orders/:id/cancel    | Customer       | Cancel order        |

### Admin
| Method | Endpoint              | Access | Description       |
|--------|-----------------------|--------|-------------------|
| GET    | /api/admin/stats      | Admin  | Dashboard stats   |
| GET    | /api/admin/users      | Admin  | All users         |
| PUT    | /api/admin/users/:id  | Admin  | Update user       |
| DELETE | /api/admin/users/:id  | Admin  | Delete user       |
| POST   | /api/admin/sellers    | Admin  | Create seller     |
| GET    | /api/admin/orders     | Admin  | All orders        |
| GET    | /api/admin/products   | Admin  | All products      |

---

## 🔌 Socket.io Events

| Event                 | Direction        | Description                   |
|-----------------------|------------------|-------------------------------|
| `join`                | Client → Server  | Join user/seller room         |
| `new_order`           | Server → Sellers | Notify sellers of new order   |
| `order_status_update` | Server → Customer| Real-time status update       |

---

## 🎟️ Coupon Codes (Demo)

| Code     | Discount |
|----------|----------|
| HOSTEL10 | 10% off  |
| FIRST20  | 20% off  |

---

## 🚀 Deployment Guide

### Deploy Backend to Render / Railway

1. Push code to GitHub
2. Create new **Web Service** on Render
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add environment variables from `.env`
6. Use **MongoDB Atlas** URI for `MONGO_URI`

### Deploy Frontend to Vercel / Netlify

1. Push `frontend/` to GitHub
2. Import project on Vercel
3. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
4. Update `frontend/src/utils/api.js` baseURL to your backend URL
5. Update `frontend/vite.config.js` proxy target to backend URL

### MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free M0 cluster
3. Create database user
4. Whitelist IP (0.0.0.0/0 for all)
5. Get connection string → paste in `.env` as `MONGO_URI`

---

## ✨ Features Summary

### Customer Panel
- ✅ Register / Login
- ✅ Browse products with category filter & search
- ✅ Add to cart / update quantity / remove
- ✅ Checkout with room number & phone
- ✅ Cash on Delivery or UPI payment
- ✅ Coupon codes (HOSTEL10, FIRST20)
- ✅ Order history & real-time status tracking
- ✅ Cancel pending orders
- ✅ Edit profile & change password
- ✅ Dark mode

### Seller Panel
- ✅ Seller dashboard with stats
- ✅ Add / Edit / Delete products
- ✅ Toggle product availability
- ✅ View & manage incoming orders
- ✅ Update order status (Accept → Prepare → Dispatch → Deliver)
- ✅ Real-time new order notifications via Socket.io

### Admin Panel
- ✅ Dashboard with revenue charts & top products
- ✅ Manage all users (activate/deactivate, change roles)
- ✅ Create seller accounts
- ✅ View & update all orders
- ✅ Manage all products (toggle, delete)

---

## 🛠️ Customization Tips

1. **UPI ID**: Update `UPI_ID` in backend `.env` and `CheckoutPage.jsx`
2. **QR Code**: Replace the QR placeholder in `CheckoutPage.jsx` with a real QR image URL
3. **Coupons**: Add more coupon codes in `CheckoutPage.jsx` and `orders.js`
4. **Categories**: Extend the `category` enum in `Product.js` and update frontend arrays
5. **Hostel Name**: Replace "HostelBite" globally with your hostel/store name

---

Made with ❤️ for hostelers 🍟
