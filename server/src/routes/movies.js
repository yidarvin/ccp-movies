import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { formatMovie, formatWatchedMovie, movieInclude, watchedMovieInclude } from '../lib/formatMovie.js'
import { fetchStreamingData } from '../lib/fetchStreaming.js'

const router = Router()
const TMDB_BASE = 'https://api.themoviedb.org/3'

// ── Background helpers (fire-and-forget after movie add) ──────────

async function bgFetchStreaming(movieId, tmdbId) {
  const data = await fetchStreamingData(tmdbId)
  if (!data) return
  await prisma.movie.update({
    where: { id: movieId },
    data: {
      streamingPlatforms: JSON.stringify(data.platforms),
      streamingInfo:      JSON.stringify(data.streamingInfo),
      streamingUpdatedAt: new Date(),
    },
  })
}

async function bgFetchRuntime(movieId, tmdbId) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return
  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}?api_key=${apiKey}`)
  if (!res.ok) return
  const data = await res.json()
  if (data.runtime) {
    await prisma.movie.update({ where: { id: movieId }, data: { runtime: data.runtime } })
  }
}

// ── Routes ────────────────────────────────────────────────────────

// GET /api/movies — list unwatched movies sorted by netVotes desc
router.get('/', requireAuth, async (req, res) => {
  const movies = await prisma.movie.findMany({
    where: { watchedAt: null, deletedAt: null },
    include: movieInclude,
    orderBy: { addedAt: 'desc' },
  })

  const formatted = movies
    .map((m) => formatMovie(m, req.user.id))
    .sort((a, b) => b.netVotes - a.netVotes)

  res.json({ movies: formatted })
})

// GET /api/movies/watched — watched movies ordered by watchedAt desc
// Must be declared before /:id so "watched" is not matched as an id param
router.get('/watched', requireAuth, async (req, res) => {
  const movies = await prisma.movie.findMany({
    where: { watchedAt: { not: null }, deletedAt: null },
    include: watchedMovieInclude,
    orderBy: { watchedAt: 'desc' },
  })

  res.json({ movies: movies.map((m) => formatWatchedMovie(m, req.user.id)) })
})

// GET /api/movies/deleted — soft-deleted movies (admin only)
// Must be declared before /:id so "deleted" is not matched as an id param
router.get('/deleted', requireAuth, requireAdmin, async (req, res) => {
  const movies = await prisma.movie.findMany({
    where: { deletedAt: { not: null } },
    include: movieInclude,
    orderBy: { deletedAt: 'desc' },
  })

  res.json({ movies: movies.map((m) => formatMovie(m, req.user.id)) })
})

// POST /api/movies — add a movie
router.post('/', requireAuth, async (req, res) => {
  const { tmdbId, title, year, posterPath, genres, streamingPlatforms, overview } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  if (tmdbId) {
    const existing = await prisma.movie.findUnique({ where: { tmdbId: Number(tmdbId) } })
    if (existing && !existing.deletedAt) {
      return res.status(409).json({ error: 'This movie has already been added' })
    }
    if (existing && existing.deletedAt) {
      // Re-adding a soft-deleted movie restores it (and its vote history) instead of erroring —
      // tmdbId is unique, so a deleted row would otherwise permanently block re-adding.
      const restored = await prisma.movie.update({
        where: { id: existing.id },
        data: { deletedAt: null, watchedAt: null },
        include: movieInclude,
      })
      return res.status(201).json({ movie: formatMovie(restored, req.user.id) })
    }
  }

  const movie = await prisma.movie.create({
    data: {
      tmdbId:             tmdbId ? Number(tmdbId) : null,
      title,
      year:               year ? Number(year) : null,
      posterPath:         posterPath || null,
      genres:             JSON.stringify(genres || []),
      streamingPlatforms: JSON.stringify(streamingPlatforms || []),
      overview:           overview || null,
      addedById:          req.user.id,
    },
    include: movieInclude,
  })

  res.status(201).json({ movie: formatMovie(movie, req.user.id) })

  // Background: fetch streaming availability and runtime from TMDB.
  // Errors are logged but don't affect the response already sent.
  if (movie.tmdbId) {
    bgFetchStreaming(movie.id, movie.tmdbId).catch((err) =>
      console.error(`[bg] streaming fetch failed for movie ${movie.id}:`, err.message)
    )
    bgFetchRuntime(movie.id, movie.tmdbId).catch((err) =>
      console.error(`[bg] runtime fetch failed for movie ${movie.id}:`, err.message)
    )
  }
})

// POST /api/movies/:id/refresh-streaming — re-fetch and cache streaming info
router.post('/:id/refresh-streaming', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie || movie.deletedAt) return res.status(404).json({ error: 'Movie not found' })
  if (!movie.tmdbId) return res.status(400).json({ error: 'Movie has no TMDB ID' })

  let data
  try {
    data = await fetchStreamingData(movie.tmdbId)
  } catch (err) {
    return res.status(502).json({ error: 'Streaming API request failed' })
  }

  if (!data) return res.status(503).json({ error: 'STREAMING_API_KEY not configured' })

  const updated = await prisma.movie.update({
    where: { id },
    data: {
      streamingPlatforms: JSON.stringify(data.platforms),
      streamingInfo:      JSON.stringify(data.streamingInfo),
      streamingUpdatedAt: new Date(),
    },
    include: movieInclude,
  })

  res.json({ movie: formatMovie(updated, req.user.id) })
})

// PATCH /api/movies/:id/watch — mark a movie as watched
router.patch('/:id/watch', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie || movie.deletedAt) return res.status(404).json({ error: 'Movie not found' })
  if (movie.watchedAt) return res.status(409).json({ error: 'Already marked as watched' })

  await prisma.movie.update({ where: { id }, data: { watchedAt: new Date() } })

  const updated = await prisma.movie.findUnique({
    where: { id },
    include: watchedMovieInclude,
  })

  res.json({ movie: formatWatchedMovie(updated, req.user.id) })
})

// PATCH /api/movies/:id/unwatch — undo: move a watched movie back to the list
router.patch('/:id/unwatch', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie || movie.deletedAt) return res.status(404).json({ error: 'Movie not found' })
  if (!movie.watchedAt) return res.status(409).json({ error: 'Not marked as watched' })

  // WatchedVote rows are intentionally kept — they reappear if the movie is re-watched.
  const updated = await prisma.movie.update({
    where: { id },
    data: { watchedAt: null },
    include: movieInclude,
  })

  res.json({ movie: formatMovie(updated, req.user.id) })
})

// PATCH /api/movies/:id/watched-date — correct the recorded watch date
router.patch('/:id/watched-date', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const { watchedAt } = req.body

  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie || movie.deletedAt) return res.status(404).json({ error: 'Movie not found' })
  if (!movie.watchedAt) return res.status(409).json({ error: 'Movie is not marked as watched' })

  // watchedAt is a date-only "YYYY-MM-DD" string (from a native date input). Anchor it to
  // UTC noon rather than UTC midnight — midnight rolls back to the previous calendar day once
  // formatted in any timezone behind UTC (e.g. US timezones), which would silently show the
  // wrong date. Noon leaves a 12-hour margin in both directions for any real-world timezone.
  if (typeof watchedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(watchedAt)) {
    return res.status(400).json({ error: 'Invalid watchedAt date' })
  }
  const date = new Date(`${watchedAt}T12:00:00.000Z`)
  if (isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid watchedAt date' })
  // Compare against the end of today in UTC (not "now") so a date-only input of "today" always
  // validates regardless of the client's timezone offset from UTC.
  const endOfTodayUtc = new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999Z`)
  if (date > endOfTodayUtc) return res.status(400).json({ error: 'Watch date cannot be in the future' })

  const updated = await prisma.movie.update({
    where: { id },
    data: { watchedAt: date },
    include: watchedMovieInclude,
  })

  res.json({ movie: formatWatchedMovie(updated, req.user.id) })
})

// PATCH /api/movies/:id/restore — admin only, undo a soft delete
router.patch('/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return res.status(404).json({ error: 'Movie not found' })
  if (!movie.deletedAt) return res.status(409).json({ error: 'Movie is not deleted' })

  await prisma.movie.update({ where: { id }, data: { deletedAt: null } })

  const updated = await prisma.movie.findUnique({
    where: { id },
    include: movie.watchedAt ? watchedMovieInclude : movieInclude,
  })

  const formatted = movie.watchedAt
    ? formatWatchedMovie(updated, req.user.id)
    : formatMovie(updated, req.user.id)

  res.json({ movie: formatted })
})

// DELETE /api/movies/:id — admin only, soft delete
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({ where: { id } })

  if (!movie || movie.deletedAt) {
    return res.status(404).json({ error: 'Movie not found' })
  }

  await prisma.movie.update({ where: { id }, data: { deletedAt: new Date() } })
  res.json({ success: true })
})

// GET /api/movies/:id — single movie
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findFirst({
    where: { id, deletedAt: null },
    include: movieInclude,
  })

  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' })
  }

  res.json({ movie: formatMovie(movie, req.user.id) })
})

export default router
