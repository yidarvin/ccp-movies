# 🐱 Chonky Cat Movies

A movie voting app for a small group of friends. Everyone adds movies to a shared list, upvotes or downvotes them, and the group picks what to watch.

## Features

- **JWT authentication** with invite-code gate
- **TMDB search** — search movies by title and genre, auto-fills metadata, overview, and runtime
- **Streaming availability** — auto-fetched on add, cached in DB, refresh on demand
- **Voting** — upvote / downvote with optimistic UI (instant feedback, reverts on error)
- **Sort & filter** — Top Voted / Recently Added / Recently Voted; filter by genre or platform
- **Expandable cards** — click any card to see overview, runtime, and streaming links
- **Watched list** — mark movies as watched; log thumbs-up / thumbs-down with usernames
- **Admin panel** — manage movies and users (admin-only)
- **Dark cinema theme** — amber/gold accents on dark zinc

---

## Quick start (local dev)

### Prerequisites

- Node.js 20+
- npm 9+

### 1. Install all dependencies

```bash
npm install          # root (installs concurrently)
cd server && npm install
cd ../client && npm install
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in your API keys:

| Variable | Description | Where to get it |
|---|---|---|
| `JWT_SECRET` | Random secret for signing tokens | Any random string |
| `INVITE_CODE` | Code users need to register (case-insensitive) | Choose any string |
| `ADMIN_PASSWORD` | Password for the seeded `admin` user | Choose a strong password — if left unset, no admin user is seeded |
| `TMDB_API_KEY` | TMDB v3 API key | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (free) |
| `STREAMING_API_KEY` | RapidAPI key for Streaming Availability | [rapidapi.com/…/streaming-availability](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability) |

### 3. Initialise the database

```bash
cd server
npm run db:migrate   # creates SQLite db + runs migrations
npm run db:seed      # creates admin user 'admin' with the ADMIN_PASSWORD you set
```

### 4. Run both services

```bash
# From the repo root:
npm run dev
```

| Service | URL |
|---|---|
| React client | http://localhost:5173 |
| Express API  | http://localhost:3001 |

### Default credentials

| Field | Value |
|---|---|
| Username | `admin` |
| Password | whatever you set in `ADMIN_PASSWORD` |
| Invite code | whatever you set in `INVITE_CODE` |

> **Change the admin password** any time via `POST /api/auth/change-password` (body: `{ currentPassword, newPassword }`, requires the current auth token) — no direct DB access needed.
>
> **Upgrading an existing deployment?** If you seeded before `ADMIN_PASSWORD` existed, the admin account still has whatever password it was created with (previously the hardcoded `changeme`). Rotate it immediately:
> ```bash
> TOKEN=$(curl -s -X POST <your-api-url>/api/auth/login -H 'Content-Type: application/json' \
>   -d '{"username":"admin","password":"changeme"}' | jq -r .token)
> curl -X POST <your-api-url>/api/auth/change-password -H "Authorization: Bearer $TOKEN" \
>   -H 'Content-Type: application/json' \
>   -d '{"currentPassword":"changeme","newPassword":"<new-strong-password>"}'
> ```

---

## Docker (production)

### Prerequisites

- Docker 24+
- Docker Compose v2

### 1. Create an env file

```bash
cp server/.env.example .env
```

Edit `.env` in the **repo root** (docker-compose reads it):

```dotenv
JWT_SECRET=a-long-random-secret-string
INVITE_CODE=your-invite-code
ADMIN_PASSWORD=a-strong-admin-password
TMDB_API_KEY=your_tmdb_key
STREAMING_API_KEY=your_rapidapi_key
APP_PORT=80          # host port to expose (default 80)
```

`JWT_SECRET` has no fallback — `docker compose up` fails fast if it's unset, rather than silently booting with a known default.

### 2. Build and start

```bash
docker compose up -d --build
```

Open **http://localhost** (or whatever `APP_PORT` you set).

The SQLite database is stored in the `db_data` Docker volume and survives container restarts.

### Stopping / updating

```bash
docker compose down          # stop (volume preserved)
docker compose up -d --build # rebuild after code changes
```

---

## Project structure

```
ccp-movies/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.js              # Express entry point
│   │   ├── seed.js               # Admin user seed
│   │   ├── lib/
│   │   │   ├── prisma.js
│   │   │   ├── formatMovie.js    # Movie + watched-movie serialisers
│   │   │   └── fetchStreaming.js  # RapidAPI streaming helper
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT middleware
│   │   └── routes/
│   │       ├── auth.js           # /api/auth/*
│   │       ├── movies.js         # /api/movies/* (inc. watch + refresh-streaming)
│   │       ├── votes.js          # /api/votes/*
│   │       ├── watchedVotes.js   # /api/watched-votes/*
│   │       ├── search.js         # /api/search  (TMDB proxy)
│   │       ├── streaming.js      # /api/streaming/:id (live Streaming Availability proxy)
│   │       └── admin.js          # /api/admin/*
│   ├── railway.toml
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── .env.example
│
├── client/
│   ├── src/
│   │   ├── api.js                # Axios instance (reads VITE_API_URL)
│   │   ├── App.jsx               # Router + Toaster
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── MovieCard.jsx     # Expandable card, votes, watch button
│   │   │   ├── WatchedMovieCard.jsx  # Watched card with thumbs votes
│   │   │   └── SearchModal.jsx   # TMDB search + add flow
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── HomePage.jsx      # Movies / Watched tabs, sort, filter
│   │       └── AdminPage.jsx
│   ├── railway.toml
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env.example              # Dev: VITE_API_URL=http://localhost:3001/api
│   └── .env.production           # Prod: VITE_API_URL=https://your-server.railway.app/api
│
├── docker-compose.yml
└── package.json                  # Root workspace (concurrently)
```

---

## API reference

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register (requires `inviteCode`) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET  | `/api/auth/me` | ✓ | Current user |
| POST | `/api/auth/change-password` | ✓ | Change your own password `{currentPassword, newPassword}` |

### Movies
| Method | Path | Auth | Description |
|---|---|---|---|
| GET    | `/api/movies` | ✓ | Unwatched movies, sorted by netVotes |
| GET    | `/api/movies/watched` | ✓ | Watched movies, sorted by watchedAt |
| GET    | `/api/movies/deleted` | admin | Soft-deleted movies, sorted by deletedAt |
| POST   | `/api/movies` | ✓ | Add a movie (restores it if it was previously soft-deleted) |
| PATCH  | `/api/movies/:id/watch` | ✓ | Mark as watched |
| PATCH  | `/api/movies/:id/unwatch` | ✓ | Undo: move a watched movie back to the list |
| PATCH  | `/api/movies/:id/watched-date` | ✓ | Correct the recorded watch date `{watchedAt}` |
| PATCH  | `/api/movies/:id/restore` | admin | Undo a soft delete |
| DELETE | `/api/movies/:id` | admin | Soft-delete a movie |

### Votes
| Method | Path | Auth | Description |
|---|---|---|---|
| POST   | `/api/votes` | ✓ | Cast / change vote `{movieId, value: 1\|-1}` |
| DELETE | `/api/votes/:movieId` | ✓ | Remove your vote |

### Watched votes & reactions
| Method | Path | Auth | Description |
|---|---|---|---|
| POST   | `/api/watched-votes` | ✓ | Cast / change thumbs `{movieId, vote: 'UP'\|'DOWN'}` |
| DELETE | `/api/watched-votes/:movieId` | ✓ | Remove your thumbs vote |
| POST   | `/api/watched-reactions` | ✓ | Set / update your one-line reaction `{movieId, text}` |
| DELETE | `/api/watched-reactions/:movieId` | ✓ | Remove your reaction |

### Search & Streaming
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/search?query=&genre=&page=` | ✓ | TMDB search proxy |
| GET | `/api/streaming/:tmdbId` | ✓ | Streaming Availability proxy (US platforms) |

### Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | admin | All users with counts |
