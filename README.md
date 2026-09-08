# Local Service Hub
> **Find Trusted Local Professionals Near You (Maithon Dam & border Bengal-Jharkhand regions)**

Local Service Hub is a robust, secure, and production-ready local marketplace application designed to connect local service providers (electricians, plumbers, AC technicians, carpenters, etc.) with local customers. The application is built using a layered Node.js architecture with MySQL/Sequelize, and separate Angular v19 SPA interfaces for consumers/partners and administrative control.

---

## 🏗️ Project Architecture

The codebase follows a professional layered MVC-style structure to ensure clean separation of concerns and database security:

```
Maithon_service_project/
├── backend/
│   ├── config/          # Sequelize database connection & JWT keys config
│   ├── controllers/     # Auth, booking, customer, provider & admin route handlers
│   ├── middlewares/     # verifyToken guards, global error interception, Multer uploads
│   ├── models/          # Sequelize database models definition & associations index
│   ├── routes/          # Express API route maps
│   ├── scripts/         # sync.js database creation & seeding script
│   ├── utils/           # Console coloring logger utility
│   ├── uploads/         # Sub-folder segregated uploads (profiles, documents, services)
│   ├── .env             # Port, DB credentials & JWT keys config variables
│   └── server.js        # Express application entry-point
├── frontend_userSide/   # Angular Customer & Service Provider App
└── frontend_admin_panel/# Angular Administrative Control Center Dashboard
```

---

## 🔌 API Documentation List

All requests must set `Content-Type: application/json`. Protected endpoints require `Authorization: Bearer <JWT_Token>`.

### 🔑 Authentication Module (`/api/auth`)
*   `POST /register` - Registers a new user. Role must be `Customer` or `Provider`.
*   `POST /login` - Log in to get JWT token. Refresh token is delivered inside an httpOnly cookie.
*   `POST /refresh` - Auto-renew access token using the refresh cookie.
*   `POST /logout` - Wipe tokens and clear secure cookies.
*   `POST /change-password` - Update password (Protected).

### 🛠️ Admin Module (`/api/admin`)
*   `GET /dashboard` - Fetchplatform statistics (Revenue, providers kyc count, bookings logs).
*   `GET /users` - Paginated and filtered lists of all users.
*   `PUT /users/:id/status` - Suspend/Activate user accounts.
*   `POST /create-admin` - Register a new Administrator dynamically (Admin Only).
*   `GET /providers` - List all service providers.
*   `PUT /providers/:id/verify` - Approve (`Verified`) or reject (`Rejected`) a provider's KYC documents.
*   `POST /locations/cities` - Add a new city.
*   `POST /locations/areas` - Add a new area (with pincode) linked to a city.
*   `GET /support` - List user query tickets.
*   `PUT /support/:id/resolve` - Mark queries as resolved.

### 👥 Customer Module (`/api/customers`)
*   `GET /profile` - Retrieve self profile.
*   `PUT /profile` - Update profile address / upload profile avatar picture.
*   `GET /providers/search` - Search providers with category, city, area and name filters.
*   `GET /providers/:id` - Detailed provider catalog page with reviews history.
*   `POST /favorites` - Add/Remove providers to favorites.
*   `GET /favorites` - Retrieve customer favorites list.
*   `POST /reviews` - Submit a 1-5 star review for a completed service booking.
*   `POST /support` - Submit a contact message (Public).

### 👷 Provider Module (`/api/providers`)
*   `GET /profile` - Get business profile specs.
*   `PUT /profile` - Update business details (pricing, experience, skills lists).
*   `POST /kyc` - Upload Aadhaar/PAN card file attachments.
*   `POST /availability` - Switch online presence status (`Available`, `Busy`, `Offline`).
*   `GET /dashboard` - Fetch provider's earnings and review logs.
*   `GET /bookings` - Fetch list of assigned booking requests.

### 📅 Bookings Module (`/api/bookings`)
*   `POST /` - Create a booking request (Customer only).
*   `GET /history/customer` - Retrieve bookings log (Customer only).
*   `GET /:id` - Get details of a single booking.
*   `PUT /:id/status` - Update booking status (`Accepted`, `Rejected`, `Completed`, `Cancelled`).

---

## ⚡ Installation & Execution Guide

### 1. Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **MySQL Server** (make sure it is running locally on port `3306`)

### 2. Configure Environment Variables
Navigate to `backend/.env` and update the database settings:
```env
PORT=5000
NODE_ENV=development

# Database Settings
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=maithon_service_db

# Secrets keys
JWT_SECRET=maithon_local_service_hub_access_secret_key_2026
JWT_REFRESH_SECRET=maithon_local_service_hub_refresh_secret_key_2026
JWT_EXPIRATION=900          # 15 mins
JWT_REFRESH_EXPIRATION=86400 # 24 hrs
```

### 3. Initialize Database & Seed Demo Data
Open your MySQL client or CLI and create the database schema:
```sql
CREATE DATABASE maithon_service_db;
```

Run the database synchronization and seeding script:
```bash
cd backend
npm run db:sync
```
*This command drops existing tables, creates the schema with proper constraints, and seeds:*
*   Roles (`Admin`, `Provider`, `Customer`).
*   Super Admin credentials: `admin@localservice.com` / `Admin@123`.
*   Locations (Dhanbad, Paschim Bardhaman with areas Maithon Dam, Chirkunda, Barakar, etc.).
*   Categories (Electrician, Plumber, AC Repair) and core service list.

### 4. Start the Application

#### **Backend Server:**
```bash
cd backend
npm run dev
```
*The server will run on `http://localhost:5000`.*

#### **Frontend Customer Side (Angular):**
```bash
cd frontend_userSide
npm start
```
*Accessible on `http://localhost:4200`.*

#### **Frontend Admin Side (Angular):**
```bash
cd frontend_admin_panel
npm start
```
*Accessible on `http://localhost:4201` (automatically sets up next port).*

---

## 🔒 Security Implementations
*   **BCrypt**: 10-rounds salt hashing for user password storage.
*   **Helmet**: Auto-enforcement of HTTP headers protections (XSS, Clickjacking protection).
*   **Rate Limiter**: Maximum 200 API calls per 15 minutes window per IP to avoid DDoS loops.
*   **Express Validator**: Input validation on endpoints to block SQL Injections and malicious request states.
*   **httpOnly Cookies**: Store JWT refresh tokens inside server-only cookies to stop token thefts from JavaScript memory.
