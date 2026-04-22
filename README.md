# Savora

Premium food delivery platform with customer, driver, and admin experiences.

Savora is a full-stack Uber Eats style project built to feel like a real product, not just a CRUD demo. The frontend focuses on polished restaurant discovery, fast checkout, and clear order tracking, while the backend handles authentication, delivery lifecycle management, notifications, admin metrics, and simulated live tracking.

This is a single repository that contains two apps:

- `delivery-frontend`: Next.js 14 app for customers, drivers, and admins
- `delivery-backend`: Go API built with Gin, GORM, and PostgreSQL

## What The Project Includes

### Customer experience

- Editorial restaurant discovery with featured collections and category browsing
- Menu browsing, cart management, and checkout flow
- Order history with active tracking and reorder paths
- JWT-backed sign-up, sign-in, and session-aware account flows

### Driver experience

- Dedicated driver workspace
- List of available deliveries
- Delivery acceptance and status progression
- Assigned delivery view with route progress

### Admin experience

- Dashboard with operational metrics
- Recent delivery feed
- Delivery overview for monitoring platform activity

### Backend capabilities

- Role-based access control for `customer`, `driver`, and `admin`
- Delivery quoting from pickup and drop-off addresses
- PostgreSQL persistence for users, deliveries, tracking points, status history, orders, and notifications
- Optional Redis-backed caching with in-memory fallback
- Background tracking updates for active deliveries
- Automatic schema migration on startup

## Architecture

```mermaid
flowchart LR
  UI["Next.js frontend<br/>customer, driver, admin"] --> API["Gin REST API<br/>JWT auth + business logic"]
  API --> PG["PostgreSQL<br/>users, orders, deliveries, tracking"]
  API --> CACHE["Redis (optional)<br/>cache + publish support"]
  API --> JOBS["Background tracker<br/>simulated live location updates"]
```

## Stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, Framer Motion |
| Backend | Go 1.25.6, Gin, GORM |
| Database | PostgreSQL |
| Cache | Redis optional, in-memory fallback available |

## Project Structure

```text
.
├── package.json
├── go.work
├── scripts/dev.sh
├── delivery-backend
│   ├── cmd/api
│   ├── internal/handlers
│   ├── internal/services
│   ├── internal/models
│   └── internal/routes
└── delivery-frontend
    ├── src/app
    ├── src/components
    ├── src/services
    └── src/store
```

## Quick Start

### 1. Configure the backend

Create `delivery-backend/.env`:

```dotenv
PORT=8080

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=delivery_backend
DB_SSLMODE=disable
DB_TIMEZONE=UTC

JWT_SECRET=change-this-in-production
JWT_EXPIRATION_HOURS=24
FRONTEND_URL=http://localhost:3000
EMAIL_VERIFICATION_CODE_TTL_MINUTES=10
EXPOSE_EMAIL_VERIFICATION_CODE=true

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/api/v1/auth/social/google/callback

APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_REDIRECT_URL=https://your-public-api-domain/api/v1/auth/social/apple/callback

CACHE_TTL_SECONDS=20
TRACKING_TICK_SECONDS=8
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60

# Optional Redis
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
```

`DATABASE_URL` is also supported and overrides the `DB_*` settings.

Run the API:

```bash
npm run backend:dev
```

The backend auto-migrates the schema and starts on `http://localhost:8080`.

### 2. Configure the frontend

Create `delivery-frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_USE_MOCK_API=false
```

Install frontend dependencies:

```bash
npm run frontend:install
```

### 3. Run the full stack from the repo root

```bash
npm run dev
```

That starts:

- frontend on `http://localhost:3000`
- backend on `http://localhost:8080`

If you want to start each app separately from the root:

```bash
npm run backend:dev
npm run frontend:dev
```

You can still use the original app-specific commands if you prefer:

```bash
cd delivery-frontend
npm run dev
```

Frontend default URL: `http://localhost:3000`

If you want to work on UI only, set `NEXT_PUBLIC_USE_MOCK_API=true`.

## Development Commands

From the repo root:

```bash
npm run backend:test
npm run backend:dev
```

```bash
npm run frontend:lint
npm run frontend:build
npm run frontend:dev
```

Direct app commands still work:

```bash
cd delivery-backend
go run ./cmd/api

cd ../delivery-frontend
npm run lint
npm run build
```

Detailed provider setup:

- [Social auth setup](./docs/social-auth-setup.md)

## API Surface

### Public

- `GET /`
- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/register/request-code`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/social/:provider/start`
- `GET /api/v1/auth/social/:provider/callback`
- `POST /api/v1/auth/social/:provider/callback`
- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/:slug`

### Authenticated

- `GET /api/v1/auth/me`
- `POST /api/v1/deliveries/quote`
- `POST /api/v1/deliveries`
- `GET /api/v1/deliveries`
- `GET /api/v1/deliveries/history`
- `GET /api/v1/deliveries/:id/status-history`
- `GET /api/v1/deliveries/:id/tracking`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`

### Driver

- `GET /api/v1/driver/deliveries/available`
- `GET /api/v1/driver/deliveries/assigned`
- `PATCH /api/v1/driver/deliveries/:id/accept`
- `PATCH /api/v1/driver/deliveries/:id/status`

### Admin

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/deliveries`

## Notes

- Restaurant data is currently mocked in code from `delivery-backend/internal/services/catalog.go`.
- Delivery tracking is simulated from address-derived coordinates and updated by a background ticker.
- Redis is optional. If it is missing or unavailable, the backend continues with in-memory caching.
- The frontend metadata and product copy refer to the experience as `Savora`.
- Apple Sign in for web requires a public HTTPS redirect URL. `localhost` is not valid for the Apple callback on April 20, 2026.
