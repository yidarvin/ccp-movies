import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { formatMovie } from '../lib/formatMovie.js'

const router = Router()

// GET /api/movies — list all movies sorted by netVotes desc
router.get('/', requireAuth, async (req, res) => {
  const movies = await prisma.movie.findMany({
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

// POST /api/movies — add a movie
router.post('/', requireAuth, async (req, res) => {
  const { tmdbId, title, year, posterPath, genres, streamingPlatforms } = req.body

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
      tmdbId: tmdbId ? Number(tmdbId) : null,
      title,
      year: year ? Number(year) : null,
      posterPath: posterPath || null,
      genres: JSON.stringify(genres || []),
      streamingPlatforms: JSON.stringify(streamingPlatforms || []),
      addedById: req.user.id,
    },
    include: {
      votes: true,
      addedBy: { select: { id: true, username: true } },
    },
  })

  res.status(201).json({ movie: formatMovie(movie, req.user.id) })
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
