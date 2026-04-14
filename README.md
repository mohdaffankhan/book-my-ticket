# Book My Ticket

A simplified seat-booking platform built on top of the [ChaiCode starter](https://github.com/chaicodehq/book-my-ticket). The starter provided a working `GET /seats` and `PUT /:id/:name` endpoint. This submission extends it with a full authentication layer, a protected booking flow, user–booking association, and a complete frontend UI.

---

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express 5
- **Database:** PostgreSQL (via `pg` pool)
- **Auth:** JWT — access token (15m) + rotating refresh token (7d) stored in an `httpOnly` cookie
- **Validation:** Zod
- **Frontend:** Vanilla JS + Tailwind CSS (served by Express at `GET /`)

---

## Project Structure

```
├── index.mjs                        # Entry point — mounts all routes
├── index.html                       # Frontend UI (login, signup, seat grid)
├── config/
│   └── env.js                       # Environment config with defaults
├── db/
│   └── index.js                     # Shared pg pool + query helper
├── auth/
│   ├── routes.js                    # /api/v1/auth/* routes
│   ├── controllers.js               # Request handlers
│   ├── service.js                   # Business logic
│   ├── models.js                    # Zod DTOs (SignUpDto, SignInDto)
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT parsing + route protection
│   │   └── error.middleware.js      # Global error handler
│   └── utils/
│       ├── index.js                 # Password hashing, token generation
│       └── sanitize.js             # Strip sensitive fields from user rows
├── booking/
│   └── service.js                   # Transactional seat booking logic
├── dto/
│   └── base.dto.js                  # Base Zod DTO class
├── utils/
│   ├── api-error.js                 # ApiError with static helpers
│   └── api-response.js             # Consistent JSON response shape
├── schema.sql                       # Database schema (run once)
├── seed.sql                         # 20 seats seed (run once)
└── docker-compose.yml               # PostgreSQL container (local dev)
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker compose up -d
```

### 2. Apply the schema and seed

```bash
# Apply schema
docker exec -i sql_class_2 psql -U postgres -d sql_class_2_db < schema.sql

# Seed 20 seats
docker exec -i sql_class_2 psql -U postgres -d sql_class_2_db < seed.sql
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the server

```bash
npm run dev      # development — auto-restarts on file change
npm start        # production
```

### 5. Open the app

```
http://localhost:8080
```

> **Important:** always open the app through the Express server URL, not via Live Server or `file://`. The frontend uses relative URLs (`/seats`, `/api/v1/auth/signin`) so it must be served by Express to work.

---

## Environment Variables

The app runs with sensible defaults out of the box. Override any of these in a `.env` file or your hosting platform:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/sql_class_2_db` | Postgres connection string |
| `ACCESS_TOKEN_SECRET` | `access_secret_change_in_production` | JWT signing secret |
| `REFRESH_TOKEN_SECRET` | `refresh_secret_change_in_production` | Refresh token secret |
| `ACCESS_TOKEN_EXPIRY` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token lifetime |
| `NODE_ENV` | `development` | Set to `production` in hosted environments |
| `PORT` | `8080` | Server port |
| `RENDER_EXTERNAL_URL` | — | Set automatically by Render — enables keep-alive pings |

---

## Frontend

The frontend is a single-page vanilla JS app served at `GET /` by Express. No separate build step required.

**Features:**
- **Login / Sign Up** — tab-switched auth forms with inline validation errors
- **Auto-login after signup** — signs in immediately after account creation
- **Seat grid** — identical to the starter: emerald for available, rose for booked, hover tooltip shows who booked each seat
- **Silent token refresh** — when the access token expires, the frontend automatically calls `/api/v1/auth/refresh/token` (the browser sends the `httpOnly` cookie), gets a new token, and retries the original request without interrupting the user
- **Sign Out** — clears the refresh token server-side and removes the local session
- **Session persistence** — access token and username stored in `localStorage`; page reload keeps you logged in

---

## API Reference

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/signup` | — | Register a new user |
| `POST` | `/signin` | — | Login, returns `accessToken` + sets `refreshToken` cookie |
| `GET` | `/me` | Bearer | Get the logged-in user's profile |
| `POST` | `/signout` | Bearer | Revoke refresh token and clear cookie |
| `POST` | `/refresh/token` | Cookie | Rotate tokens silently |

#### Register
```
POST /api/v1/auth/signup
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secret123"  // min 8 characters
}
```

#### Login
```
POST /api/v1/auth/signin
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secret123"
}
```
Returns `{ accessToken }` in body. Sets `refreshToken` as an `httpOnly` cookie.

---

### Booking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/seats` | — | List all 20 seats with booking status |
| `PUT` | `/:id/:name` | Bearer | Book a seat |

- Returns `409` if the seat is already booked
- Returns `401` if not authenticated
- The `:name` param is kept for frontend compatibility; the logged-in user's identity (from JWT) is what gets stored

---

## Authentication Flow

```
1. POST /signup       → user created, password hashed with HMAC-SHA256 + random salt
2. POST /signin       → accessToken (15m) in response body
                        refreshToken (7d) in httpOnly cookie + persisted in DB
3. Protected request  → Authorization: Bearer <accessToken>
4. Token expires (401)→ frontend calls POST /refresh/token automatically
                        → browser sends httpOnly cookie
                        → server rotates both tokens
                        → frontend retries original request with new token
5. POST /signout      → refresh token cleared from DB and cookie removed
```

**Refresh token reuse detection:** if a previously invalidated refresh token is presented (e.g. a stolen token used after logout), all sessions for that user are immediately invalidated.

---

## Booking Flow

```
1. GET /seats                  →  view available seats (public)
2. POST /signin                →  get accessToken
3. PUT /5/johndoe              →  book seat #5
                                  - transaction opened
                                  - SELECT ... FOR UPDATE (prevents race conditions)
                                  - seat marked as booked
                                  - record inserted into bookings table (user_id + seat_id)
                                  - transaction committed
4. PUT /5/johndoe (again)      →  409 Conflict — seat already booked
5. PUT /7/johndoe (no token)   →  401 Unauthorized
```

Duplicate bookings are prevented both at the database level (`SELECT ... FOR UPDATE` inside a transaction) and by the application returning a `409` before any update is attempted on an already-booked seat.
