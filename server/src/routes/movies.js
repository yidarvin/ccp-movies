import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { formatMovie, formatWatchedMovie } from '../lib/formatMovie.js'
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
    where: { watchedAt: null },
    include: {
      votes: true,
      addedBy: { select: { id: true, username: true } },
    },
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
    where: { watchedAt: { not: null } },
    include: {
      watchedVotes: {
        include: { user: { select: { id: true, username: true } } },
      },
      addedBy: { select: { id: true, username: true } },
    },
    orderBy: { watchedAt: 'desc' },
  })

  res.json({ movies: movies.map((m) => formatWatchedMovie(m, req.user.id)) })
})

// POST /api/movies — add a movie
router.post('/', requireAuth, async (req, res) => {
  const { tmdbId, title, year, posterPath, genres, streamingPlatforms, overview } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  if (tmdbId) {
    const existing = await prisma.movie.findUnique({ where: { tmdbId: Number(tmdbId) } })
    if (existing) {
      return res.status(409).json({ error: 'This movie has already been added' })
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
    include: {
      votes: true,
      addedBy: { select: { id: true, username: true } },
    },
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
  if (!movie) return res.status(404).json({ error: 'Movie not found' })
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
    include: {
      votes: true,
      addedBy: { select: { id: true, username: true } },
    },
  })

  res.json({ movie: formatMovie(updated, req.user.id) })
})

// PATCH /api/movies/:id/watch — mark a movie as watched
router.patch('/:id/watch', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return res.status(404).json({ error: 'Movie not found' })
  if (movie.watchedAt) return res.status(409).json({ error: 'Already marked as watched' })

  await prisma.movie.update({ where: { id }, data: { watchedAt: new Date() } })

  const updated = await prisma.movie.findUnique({
    where: { id },
    include: {
      watchedVotes: {
        include: { user: { select: { id: true, username: true } } },
      },
      addedBy: { select: { id: true, username: true } },
    },
  })

  res.json({ movie: formatWatchedMovie(updated, req.user.id) })
})

// DELETE /api/movies/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({ where: { id } })

  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' })
  }

  await prisma.movie.delete({ where: { id } })
  res.json({ success: true })
})

// GET /api/movies/:id — single movie
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      votes: true,
      addedBy: { select: { id: true, username: true } },
    },
  })

  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' })
  }

  res.json({ movie: formatMovie(movie, req.user.id) })
})

export default router
