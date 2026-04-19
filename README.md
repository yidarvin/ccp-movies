# 🐱 Chonky Cat Movies

A movie voting app for a small group of friends. Everyone adds movies to a shared list, upvotes or downvotes them, and when you’re ready you reveal the top picks with a dramatic countdown.

## Features

- **JWT authentication** with invite-code gate
- **TMDB search** — search movies by title and genre, auto-fills metadata
- **Streaming availability** — check which platforms each movie is on (per-result, on demand)
- **Voting** — upvote / downvote with optimistic UI (instant feedback, reverts on error)
- **Sort & filter** — Top Voted / Recently Added / Recently Voted; filter by genre or platform
- **Reveal page** (`/chonky-cat-movies`) — top-5 cards face-down, dramatic one-by-one reveal with gold animation
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
| `INVITE_CODE` | Code users need to register | Choose one, default `FUCKBLIZZARD` |
| `TMDB_API_KEY` | TMDB v3 API key | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (free) |
| `STREAMING_API_KEY` | RapidAPI key for Streaming Availability | [rapidapi.com/…/streaming-availability](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability) |

### 3. Initialise the database

```bash
cd server
npm run db:migrate   # creates SQLite db + runs migrations
npm run db:seed      # creates admin user (admin / changeme)
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
| Password | `changeme` |
| Invite code | `FUCKBLIZZARD` |

> **Change the admin password** after first login by updating the DB directly (`npm run db:studio`).

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
INVITE_CODE=FUCKBLIZZARD
TMDB_API_KEY=your_tmdb_key
STREAMING_API_KEY=your_rapidapi_key
APP_PORT=80          # host port to expose (default 80)
```

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
│   │   │   └── formatMovie.js    # Shared movie serialiser
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT middleware
│   │   └── routes/
│   │       ├── auth.js           # /api/auth/*
│   │       ├── movies.js         # /api/movies/*
│   │       ├── votes.js          # /api/votes/*
│   │       ├── search.js         # /api/search  (TMDB proxy)
│   │       ├── streaming.js      # /api/streaming/:id (Streaming Availability proxy)
│   │       └── admin.js          # /api/admin/*
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
│   │   │   ├── MovieCard.jsx     # Poster card, optimistic votes
│   │   │   └── SearchModal.jsx   # TMDB search + per-result streaming
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── HomePage.jsx      # Grid, sort, filter, skeletons
│   │       ├── MovieNightPage.jsx   # route: /chonky-cat-movies
│   │       └── AdminPage.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env                      # Dev: VITE_API_URL=http://localhost:3001/api
│   └── .env.production           # Prod build: VITE_API_URL=/api
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

### Movies
| Method | Path | Auth | Description |
|---|---|---|---|
| GET    | `/api/movies` | ✓ | All movies, sorted by netVotes |
| POST   | `/api/movies` | ✓ | Add a movie |
| DELETE | `/api/movies/:id` | admin | Delete a movie |

### Votes
| Method | Path | Auth | Description |
|---|---|---|---|
| POST   | `/api/votes` | ✓ | Cast / change vote `{movieId, value: 1\|-1}` |
| DELETE | `/api/votes/:movieId` | ✓ | Remove your vote |

### Search & Streaming
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/search?query=&genre=&page=` | ✓ | TMDB search proxy |
| GET | `/api/streaming/:tmdbId` | ✓ | Streaming Availability proxy (US platforms) |

### Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | admin | All users with counts |
