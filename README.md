# 🎓 Codezela Career Accelerator - Student Onboarding Platform

<p align="center">
  <img src="public/images/logo-wide.png" alt="Codezela Career Accelerator" width="400">
</p>

<p align="center">
  <strong>A modern, full-stack student registration and management system for Codezela Career Accelerator programs.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Security](#security)
- [License](#license)

---

## 🎯 Overview

The **Codezela Career Accelerator Student Onboarding Platform** is a comprehensive web application designed to streamline the student registration process for career accelerator programs. It features a beautiful, animated public-facing registration form and a powerful admin dashboard for managing registrations, programs, payments, and user accounts.

### Key Highlights

- 🎨 **Stunning UI/UX** — Glassmorphism design with Three.js animated backgrounds
- 🔐 **Secure Authentication** — Supabase Auth with Row Level Security (RLS)
- 📄 **Document Management** — Secure file uploads to Cloudflare R2
- 📊 **Admin Dashboard** — Comprehensive management tools with activity logging
- 🌍 **International Support** — Multi-country support with localized fields
- ♿ **Accessibility First** — WCAG compliant components
- ⚡ **Performance Optimized** — Next.js 16 with streaming and edge capabilities

---

## ✨ Features

### Public Portal

| Feature | Description |
|---------|-------------|
| 📝 **Multi-Step Registration** | Comprehensive form with program selection, personal info, contact details, qualifications, and document uploads |
| 🎨 **3D Animated Homepage** | Interactive Three.js geometric shapes with mouse-responsive animations |
| 📎 **Secure File Uploads** | Direct-to-cloud uploads with presigned URLs (academic docs, ID proof, photo, payment slip) |
| 🛡️ **Spam Protection** | Cloudflare Turnstile integration |
| 📱 **Responsive Design** | Mobile-first approach with Tailwind CSS |
| 🌐 **International Support** | Country selection with dynamic Sri Lankan province/district fields |

### Admin Dashboard

| Feature | Description |
|---------|-------------|
| 📊 **Analytics Overview** | Real-time statistics on registrations, programs, and payments |
| 👥 **Registration Management** | View, search, filter, edit, and soft-delete student registrations |
| 📚 **Program Management** | Create, edit, and manage accelerator programs and intake windows |
| 💰 **Finance & Payments** | Track payments, generate financial reports, manage payment status |
| 👤 **User Accounts** | Admin user management with role-based access |
| 📜 **Activity Logging** | Comprehensive audit trail for all admin actions |
| 🔍 **Advanced Filtering** | Multi-criteria search and filtering capabilities |
| 📥 **CSV Export** | Export registrations and payment data to CSV |
| 🖼️ **Document Viewer** | Built-in image/PDF viewer with zoom and pan capabilities |
| 💳 **Payment Recording** | Record new payments and void existing ones |
| 🔔 **Toast Notifications** | Real-time feedback for all user actions |

---

## 🛠️ Tech Stack

### Core Framework
- **[Next.js 16](https://nextjs.org/)** — React framework with App Router
- **[React 19](https://react.dev/)** — UI library with latest features
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe development

### Database & Backend
- **[PostgreSQL](https://www.postgresql.org/)** — Primary database via Supabase
- **[Prisma ORM](https://www.prisma.io/)** — Type-safe database client
- **[Supabase](https://supabase.com/)** — Auth, database, and storage

### Storage & File Handling
- **[Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)** — S3-compatible object storage
- **[AWS SDK v3](https://aws.amazon.com/sdk-for-javascript/)** — File operations with presigned URLs

### UI & Styling
- **[Tailwind CSS 4](https://tailwindcss.com/)** — Latest version with `@import "tailwindcss"` syntax
- **[shadcn/ui](https://ui.shadcn.com/)** — Beautiful, accessible components (30+ components)
- **[Radix UI](https://www.radix-ui.com/)** — Unstyled, accessible primitives
- **CSS Variables** — Custom theming with HSL color system
- **Glassmorphism** — Backdrop blur and transparency effects throughout
- **[Framer Motion](https://www.framer.com/motion/)** — Smooth animations
- **[Three.js](https://threejs.org/)** — 3D graphics and animations
- **[Lucide React](https://lucide.dev/)** — Icon library

### Forms & Validation
- **[React Hook Form](https://react-hook-form.com/)** — Performant form handling
- **[Zod](https://zod.dev/)** — Schema validation

### Animation & Effects
- **[Framer Motion](https://www.framer.com/motion/)** — Page transitions and micro-interactions
- **[Three.js](https://threejs.org/)** — 3D animated background on homepage
- **Tailwind CSS Animations** — Blob animations, hover effects, transitions

### Security
- **[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)** — Bot protection
- **[Supabase Auth](https://supabase.com/auth)** — Authentication and authorization
- **[Row Level Security (RLS)](https://supabase.com/docs/guides/database/postgres/row-level-security)** — Database-level access control

---

## 🏗️ Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Public Pages  │  │   Admin Pages   │  │    API Routes           │  │
│  │                 │  │                 │  │                         │  │
│  │  / (Homepage)   │  │  /admin         │  │  /api/registrations     │  │
│  │  /register      │  │  /admin/programs│  │  /api/upload/presign    │  │
│  │                 │  │  /admin/finance │  │                         │  │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘  │
└───────────┼────────────────────┼───────────────────────┼────────────────┘
            │                    │                       │
            ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Server Layer (Next.js)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Server Actions │  │  Prisma Client  │  │  File Upload Service    │  │
│  │                 │  │                 │  │                         │  │
│  │  Dashboard      │  │  Database       │  │  Cloudflare R2          │  │
│  │  Actions        │  │  Queries        │  │  (S3-Compatible)        │  │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘  │
└───────────┼────────────────────┼───────────────────────┼────────────────┘
            │                    │                       │
            ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        External Services                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │    Supabase     │  │  Cloudflare R2  │  │   Cloudflare Turnstile   │  │
│  │                 │  │                 │  │                         │  │
│  │  PostgreSQL     │  │  Object Storage │  │   Bot Protection        │  │
│  │  Auth           │  │  CDN            │  │                         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Route Groups

```
app/
├── (public)/          # Public routes (no auth required)
│   ├── page.tsx       # Homepage with 3D animation
│   └── register/      # Registration form
│
├── (admin)/           # Admin routes (auth required)
│   └── admin/
│       ├── login/     # Admin login
│       └── (dashboard)/
│           ├── page.tsx           # Dashboard home
│           ├── programs/          # Program management
│           ├── registrations/     # Registration management
│           ├── finance/           # Payment tracking
│           ├── accounts/          # User management
│           └── activity/          # Activity logs
│
└── api/               # API routes
    ├── registrations/ # Registration CRUD
    └── upload/        # File upload handlers
```

---

## 📁 Project Structure

```
cca-student-onboarding-next/
├── 📁 app/                          # Next.js App Router
│   ├── (admin)/                     # Admin route group
│   │   └── admin/
│   │       ├── (dashboard)/         # Dashboard layout
│   │       │   ├── accounts/        # User management
│   │       │   ├── activity/        # Activity logs
│   │       │   ├── finance/         # Finance dashboard
│   │       │   ├── programs/        # Program CRUD
│   │       │   ├── registrations/   # Registration management
│   │       │   ├── dashboard-actions.ts
│   │       │   └── page.tsx
│   │       └── login/               # Admin login page
│   ├── (public)/                    # Public route group
│   │   ├── page.tsx                 # Homepage
│   │   └── register/                # Registration form
│   ├── api/                         # API routes
│   │   ├── registrations/           # Registration API
│   │   └── upload/                  # File upload API
│   ├── globals.css
│   └── layout.tsx
│
├── 📁 components/                   # React components
│   ├── admin/                       # Admin-specific components
│   ├── layout/                      # Layout components
│   └── ui/                          # shadcn/ui components
│
├── 📁 lib/                          # Utility libraries
│   ├── data/                        # Static data (countries, districts)
│   ├── hooks/                       # Custom React hooks
│   ├── services/                    # Business logic services
│   ├── supabase/                    # Supabase clients
│   ├── validations/                 # Zod schemas
│   ├── prisma.ts                    # Prisma client
│   └── utils.ts                     # Utility functions
│
├── 📁 hooks/                        # Global hooks
│
├── 📁 prisma/                       # Database schema
│   └── schema.prisma
│
├── 📁 scripts/                      # Utility scripts
│   ├── enable-rls.ts               # Enable Row Level Security
│   ├── import-old-registrations.mjs # Import legacy registration dump
│   ├── seed-admin.ts               # Seed admin user
│   ├── seed-programs.ts            # Seed program data
│   └── test-db.ts                  # Database connection test
│
├── 📁 public/                       # Static assets
│   └── images/
│
├── .env.example                     # Environment template
├── .gitignore
├── LICENSE                          # Proprietary license
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── prisma.config.ts
├── README.md
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- **PostgreSQL** database (Supabase recommended)
- **Cloudflare R2** bucket (for file storage)
- **Supabase** project (for auth and database)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cca-student-onboarding-next
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials. See [Environment Variables](#environment-variables) for details.

### 4. Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed programs
npx tsx scripts/seed-programs.ts

# (Optional) Create admin user
npx tsx scripts/seed-admin.ts

# (Optional) Enable RLS
npx tsx scripts/enable-rls.ts
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon key | Supabase Dashboard |
| `SUPABASE_SECRET_KEY` | Supabase service role key | Supabase Dashboard |
| `DATABASE_URL` | PostgreSQL connection URL (with PgBouncer) | Supabase Dashboard |
| `DIRECT_URL` | Direct PostgreSQL connection URL | Supabase Dashboard |
| `AUTH_SECRET` | NextAuth.js secret | Generate with `openssl rand -base64 32` |

### Turnstile Configuration

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key | Cloudflare Dashboard |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key | Cloudflare Dashboard |
| `TURNSTILE_ALLOWED_HOSTNAME` | Optional hostname pin for server validation | Your deployment hostname |

### Cloudflare R2 Configuration

| Variable | Description | Source |
|----------|-------------|--------|
| `R2_ACCESS_KEY_ID` | R2 access key ID | Cloudflare R2 Dashboard |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | Cloudflare R2 Dashboard |
| `R2_BUCKET` | Bucket name | Cloudflare R2 Dashboard |
| `R2_ENDPOINT` | R2 endpoint URL | Cloudflare R2 Dashboard |
| `R2_PUBLIC_URL` | Public access URL | Cloudflare R2 Dashboard |

### Admin Seeding

| Variable | Description | Example |
|----------|-------------|---------|
| `SEED_ADMIN_EMAIL` | Initial admin email | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | Initial admin password | `ChangeMe123!` |
| `SEED_ADMIN_NAME` | Initial admin name | `Admin User` |

### Application

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│      User       │     │  ProgramIntakeWindow│     │     Program     │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)             │     │ id (PK)         │
│ name            │     │ programId (FK)      │────▶│ code (Unique)   │
│ email (Unique)  │     │ windowName          │     │ name            │
│ password        │     │ opensAt             │     │ yearLabel       │
│ role            │     │ closesAt            │     │ durationLabel   │
│ createdAt       │     │ priceOverride       │     │ basePrice       │
│ updatedAt       │     │ isActive            │     │ currency        │
└─────────────────┘     │ createdAt           │     │ isActive        │
         │              │ updatedAt           │     │ createdBy (FK)  │◀──┐
         │              └─────────────────────┘     │ updatedBy (FK)  │◀──┤
         │                                          │ createdAt       │   │
         │                                          │ updatedAt       │   │
         │                                          └─────────────────┘   │
         │                                                                │
         │              ┌─────────────────────┐                          │
         │              │  CCARegistration    │                          │
         │              ├─────────────────────┤                          │
         │              │ id (PK)             │                          │
         │              │ registerId (Unique) │                          │
         │              │ programId (FK)      │──────────────────────────┘
         │              │ fullName            │
         │              │ emailAddress        │
         │              │ ...                 │
         │              └─────────────────────┘
         │                         │
         │                         │
         ▼                         ▼
┌───────────────────────────────────────┐
│       RegistrationPayment             │
├───────────────────────────────────────┤
│ id (PK)                               │
│ ccaRegistrationId (FK)                │
│ paymentNo                             │
│ amount                                │
│ paymentMethod                         │
│ status (active/void)                  │
│ createdAt                             │
└───────────────────────────────────────┘
```

### Models

#### `CCARegistration`
Core registration model storing student application data:
- Personal information (name, DOB, gender)
- Contact details (address, email, phone)
- Identification (NIC/Passport)
- Qualifications and documents
- Payment information
- Document URLs (stored as JSON)

#### `Program`
Career accelerator programs:
- Program code, name, and metadata
- Pricing and currency
- Active/inactive status
- Display ordering

#### `ProgramIntakeWindow`
Enrollment periods for programs:
- Opening and closing dates
- Price overrides for specific windows
- Active status

#### `RegistrationPayment`
Payment tracking for registrations:
- Payment history with sequential numbers
- Void capability with audit trail
- Receipt reference tracking

#### `AdminActivityLog`
Comprehensive audit logging:
- Actor identification (user snapshots)
- Action categorization
- Before/after data storage
- IP address and user agent tracking

---

## ⚡ Server Actions

The application uses Next.js Server Actions for all data mutations:

### Dashboard Actions (`dashboard-actions.ts`)
| Action | Description |
|--------|-------------|
| `getDashboardStats()` | Get registration statistics (active, trashed, total, by tags) |
| `getRegistrations()` | Fetch registrations with filtering and search |
| `getActivePrograms()` | List all programs for filters |
| `toggleRegistrationTrash()` | Soft-delete or restore a registration |
| `purgeRegistration()` | Permanently delete a registration |
| `getRegistrationById()` | Fetch single registration with payments |
| `updateRegistration()` | Update registration details |

### Program Actions (`programs-actions.ts`)
| Action | Description |
|--------|-------------|
| `getAllPrograms()` | List all programs with counts |
| `getProgramById()` | Fetch program with intake windows |
| `toggleProgramStatus()` | Activate/deactivate a program |
| `upsertProgram()` | Create or update a program |
| `deleteProgram()` | Delete program (if no registrations) |
| `getProgramIntakes()` | List intake windows for a program |
| `upsertIntakeWindow()` | Create or update intake window |
| `toggleIntakeStatus()` | Activate/deactivate intake window |
| `deleteIntakeWindow()` | Delete an intake window |

### Finance Actions (`finance-actions.ts`)
| Action | Description |
|--------|-------------|
| `getFinanceStats()` | Get total revenue and payment counts |
| `getPaymentLedger()` | List all payment transactions |
| `addPayment()` | Record a new payment |
| `voidPayment()` | Void a payment with reason |

### Admin Actions (`actions.ts`)
| Action | Description |
|--------|-------------|
| `loginAction()` | Authenticate admin user with Turnstile |
| `logoutAction()` | Sign out current user |
| `getAdminUsers()` | List all admin users |
| `createAdminUser()` | Create new admin account |
| `deleteAdminUser()` | Delete an admin account |

## 🔌 API Routes

### `/api/registrations`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/registrations` | Create new registration |

**Request Body:**
```typescript
{
  turnstile_token: string;
  program_id: string;
  full_name: string;
  name_with_initials: string;
  gender: "male" | "female";
  date_of_birth: string;
  // ... other fields
  academic_urls: string;      // JSON string of URLs
  nic_urls: string;           // JSON string of URLs
  passport_urls: string;      // JSON string of URLs
  photo_url: string;
  payment_url: string;
}
```

### `/api/upload/presign`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload/presign` | Get presigned URL for file upload |

**Request Body:**
```typescript
{
  filename: string;
  contentType: string;
  directory: "documents" | "receipts" | "avatars";
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    url: string;        // Presigned upload URL
    key: string;        // Storage key
    publicUrl: string;  // Public access URL
  }
}
```

---

## 🛠️ Scripts

### Database Setup

```bash
# Test database connection
npx tsx scripts/test-db.ts

# Enable Row Level Security on all tables
npx tsx scripts/enable-rls.ts

# Seed programs data
npx tsx scripts/seed-programs.ts

# Create initial admin user
npx tsx scripts/seed-admin.ts

# Import legacy MySQL registration dump (registrations + payment ledger only)
npm run import:old-registrations

# Dry-run parse only (no DB writes)
node scripts/import-old-registrations.mjs --dry-run
```

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `test-db.ts` | Verify database connectivity |
| `enable-rls.ts` | Enable RLS policies on all tables |
| `seed-programs.ts` | Seed 30+ career programs |
| `seed-admin.ts` | Create initial admin user |
| `import-old-registrations.mjs` | Import `cca_registrations` and `registration_payments` from a legacy SQL dump |

---

## 📦 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Import project from GitHub
   - Framework preset: Next.js

3. **Configure Environment Variables**
   - Add all variables from `.env.example`

4. **Deploy**
   - Vercel will build and deploy automatically

### Docker (Alternative)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

---

## 🔒 Security

### Implemented Security Measures

| Feature | Implementation |
|---------|----------------|
| **Row Level Security (RLS)** | PostgreSQL RLS policies on all tables |
| **Authentication** | Supabase Auth with session management |
| **File Upload Security** | Presigned URLs with 5-minute expiration |
| **Bot Protection** | Cloudflare Turnstile on public submissions |
| **Input Validation** | Zod schema validation on all inputs |
| **SQL Injection Prevention** | Prisma ORM with parameterized queries |
| **XSS Protection** | React's built-in escaping + CSP headers |
| **CSRF Protection** | SameSite cookies + origin validation |

### Security Best Practices

1. **Never commit `.env` files** — Always use `.env.example` as template
2. **Rotate credentials regularly** — Especially service account keys
3. **Enable RLS** — Run `scripts/enable-rls.ts` after migrations
4. **Validate file types** — Server-side validation on uploads
5. **Rate limiting** — Implement on API routes for production

---

## 📄 License

This project is proprietary software owned by **Codezela Technologies (Pvt) Ltd**.

```
Copyright (c) 2026 Codezela Technologies (Pvt) Ltd
All Rights Reserved.

Unauthorized copying, distribution, modification, public display, or public
performance of this Software is strictly prohibited.

For licensing inquiries, please contact Codezela Technologies (Pvt) Ltd.
```

See [LICENSE](LICENSE) for full terms.

---

## 🤝 Support

- 📧 **Email:** ca@codezela.com | shamal@codezela.com
- 📱 **WhatsApp:** +94 76 677 2923 | +94 76 677 8438
- 🌐 **Website:** [codezela.com](https://codezela.com)
- 📱 **Social:** [Facebook](https://www.facebook.com/codezelaca) | [LinkedIn](https://www.linkedin.com/company/codezelaca/)

---

<p align="center">
  <strong>Built with ❤️ by Codezela Technologies (Pvt) Ltd</strong>
</p>

<p align="center">
  © 2026 Codezela Technologies (Pvt) Ltd. All rights reserved.
</p>
