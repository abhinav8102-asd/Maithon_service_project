# Local Service Hub

> A full-stack, double-sided local service marketplace (Urban Company / Housejoy style) connecting customers with verified local service professionals across Maithon Dam, Dhanbad, and surrounding West Bengal–Jharkhand border areas.

---

## 📌 Project Overview

**Local Service Hub** solves the challenge of finding trustworthy local technicians (electricians, plumbers, AC mechanics, carpenters, cleaners) in tier-2/3 regions. It offers standardized service pricing, real-time booking status updates, instant Socket.io chat, admin KYC validation, and multi-tier monetization for platform admins.

The project is built as a monorepo containing:
- **Backend API Server**: Node.js, Express, Sequelize ORM, MySQL, and Socket.io.
- **Customer & Provider Portal**: Angular v19 SPA (`frontend_userSide`).
- **Admin Control Panel**: Angular v19 SPA (`frontend_admin_panel`).

---

## 🛠️ Tech Stack & Key Libraries

### Backend
- **Runtime & Framework**: Node.js, Express.js
- **Database & ORM**: MySQL, Sequelize ORM
- **Real-Time Communication**: Socket.io (room-based chat, typing states, read receipts)
- **Security & Auth**: JWT (Access + httpOnly Refresh Cookies), BCrypt.js, Helmet, Express Rate Limit, Express Validator
- **File Storage**: Multer (profile photos, Aadhaar/PAN KYC documents, service media)

### Frontend (Customer & Admin Portals)
- **Framework**: Angular v19 (Standalone Components, Signals, Reactive Forms, RxJS)
- **Real-Time Integration**: `socket.io-client`
- **Styling**: Modern CSS design system (Dark mode, glassmorphism, responsive grid)

---

## 📁 Repository Structure

```
Maithon_service_project/
├── backend/                  # Express REST API & Socket.io server
│   ├── config/               # Database connection & JWT configurations
│   ├── controllers/          # Business logic handlers (auth, booking, chat, admin, etc.)
│   ├── middlewares/          # Auth guards, role validation, file uploaders, error handlers
│   ├── models/               # Sequelize schemas & association mapping
│   ├── routes/               # API route maps
│   ├── scripts/              # DB sync & seed scripts
│   ├── uploads/              # Uploaded media (KYC docs, avatars, gallery)
│   ├── utils/                # Custom logger & utilities
│   └── server.js             # Server entry point & WebSocket handlers
├── frontend_userSide/        # Angular 19 SPA for Customers & Service Providers
│   └── src/app/
│       ├── core/             # Auth services, HTTP interceptors, guards
│       └── features/         # Auth, Home, Customer Portal, Provider Portal, Real-time Chat
├── frontend_admin_panel/     # Angular 19 SPA for System Administrators
│   └── src/app/
│       ├── core/             # Admin auth & core services
│       └── features/         # Dashboard, Providers, Bookings, Categories, Subscriptions, Settings
├── scripts/                  # Helper scripts (kill-port utility)
├── business_and_operation_guide.md # Monetization & operational breakdown
├── pitches_guide.md          # Pitch decks & strategy guide
└── README.md                 # Project documentation
```

---

## 🔑 Key Features

### 👤 Customer Features
- **Location-Based Search**: Search local technicians by city, pincode, area, and service category.
- **Transparent Catalog**: Standardized service rates to prevent on-site bargaining disputes.
- **Booking Management**: Book preferred date and time slots with real-time status tracking (`Pending` → `Accepted` → `In Progress` → `Completed`).
- **Instant Messaging**: Socket.io real-time chat with service providers including image attachments.
- **Ratings & Reviews**: Submit 1–5 star reviews upon service completion.
- **Favorites & Saved Providers**: Bookmark trusted technicians for quick re-booking.

### 👷 Service Provider Features
- **Provider Onboarding**: Profile registration with business details, working hours, and pricing lists.
- **KYC Verification**: Upload Aadhaar and PAN card documents for admin verification badge.
- **Availability Toggle**: Switch status between `Available`, `Busy`, and `Offline`.
- **Job Management**: Accept or reject incoming service booking requests.
- **Earnings & Reviews**: Track completed jobs, overall earnings, and customer reviews.
- **Subscription Packages**: Subscribe to monthly packages for boosted visibility and lower commission rates.

### 👑 Admin Control Panel
- **KYC Validation Queue**: Review provider identity documents and approve or reject verification applications.
- **User & Provider Management**: Activate, suspend, or manage platform accounts.
- **Service Catalog Builder**: Manage service categories, base pricing, duration, and required tools.
- **Location Management**: Define operational cities, areas, and pincodes.
- **Real-Time Booking Monitoring**: Track platform-wide bookings and swap/assign handlers when needed.
- **CMS & Dynamic Branding**: Customize home page hero titles, features list, workflow steps, and policies directly from the admin panel.
- **Support System**: Manage and resolve user support ticket inquiries.

---

## 🔌 API Reference Summary

Base URL: `http://localhost:5000/api`

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register as Customer or Provider
- `POST /api/auth/login` — Authenticate and receive JWT access token + refresh cookie
- `POST /api/auth/refresh` — Renew access token via refresh token cookie
- `POST /api/auth/logout` — Revoke session and clear cookies
- `POST /api/auth/change-password` — Password update (Protected)

### 👥 Customer (`/api/customers`)
- `GET /api/customers/profile` — Fetch current customer profile
- `PUT /api/customers/profile` — Update address, city, area, avatar
- `GET /api/customers/providers/search` — Search providers with filters
- `GET /api/customers/providers/:id` — View detailed provider catalog & reviews
- `POST /api/customers/favorites` — Toggle favorite provider
- `GET /api/customers/favorites` — List saved providers
- `POST /api/customers/reviews` — Submit booking review

### 👷 Provider (`/api/providers`)
- `GET /api/providers/profile` — Fetch business details
- `PUT /api/providers/profile` — Update pricing, skills, working hours
- `POST /api/providers/kyc` — Upload Aadhaar/PAN documents
- `POST /api/providers/availability` — Toggle online status
- `GET /api/providers/dashboard` — Earnings and analytics
- `GET /api/providers/bookings` — Assigned bookings list

### 📅 Bookings (`/api/bookings`)
- `POST /api/bookings` — Create a new service booking request
- `GET /api/bookings/history/customer` — Customer booking history
- `GET /api/bookings/:id` — Single booking breakdown
- `PUT /api/bookings/:id/status` — Update status (`Accepted`, `Completed`, `Cancelled`)

### 💬 Real-Time Chat (`/api/chat`)
- `GET /api/chat/conversations` — List active user chat rooms
- `GET /api/chat/messages/:roomId` — Fetch message history for room
- `POST /api/chat/upload` — Upload chat image attachment

### 🛠️ Admin (`/api/admin`)
- `GET /api/admin/dashboard` — Platform overview stats and revenue logs
- `GET /api/admin/providers` — List providers for verification
- `PUT /api/admin/providers/:id/verify` — Approve or reject provider KYC
- `PUT /api/admin/users/:id/status` — Activate/Suspend user account
- `POST /api/admin/locations/cities` — Create operational city
- `POST /api/admin/locations/areas` — Create area linked to city with pincode

---

## ⚡ Local Setup & Execution Guide

### Prerequisites
- **Node.js** (v18+)
- **MySQL Server** (Running on port `3306`)

### 1. Database Setup
Create MySQL database:
```sql
CREATE DATABASE maithon_service_db;
```

### 2. Configure Backend Environment
Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=maithon_service_db

JWT_SECRET=maithon_local_service_hub_access_secret_key_2026
JWT_REFRESH_SECRET=maithon_local_service_hub_refresh_secret_key_2026
JWT_EXPIRATION=900
JWT_REFRESH_EXPIRATION=86400
```

Seed database tables and demo data:
```bash
cd backend
npm run db:sync
```

### 3. Running the Applications

#### **Start Backend API & Socket Server**
```bash
cd backend
npm run dev
```
*(Runs on `http://localhost:5000`)*

#### **Start Customer & Provider Portal**
```bash
cd frontend_userSide
npm start
```
*(Runs on `http://localhost:4200`)*

#### **Start Admin Control Panel**
```bash
cd frontend_admin_panel
npm start
```
*(Runs on `http://localhost:4201`)*

---

## 🔐 Default Admin Credentials
- **Email**: `admin@localservice.com`
- **Password**: `Admin@123`

---

## 🛡️ Security Best Practices
- **Password Protection**: BCrypt hashing with 10 salt rounds.
- **HTTP Security Headers**: Helmet configuration blocking clickjacking and XSS attacks.
- **Token Security**: Refresh tokens stored in `httpOnly` secure cookies to prevent XSS token theft.
- **Rate Limiting**: API limit of 200 requests per 15-minute window per IP.
- **Input Validation**: Express-validator checking payload structure against SQL injection.
