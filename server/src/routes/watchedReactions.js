import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { formatWatchedMovie, watchedMovieInclude } from '../lib/formatMovie.js'

const router = Router()

async function fetchWatchedMovie(movieId, userId) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: watchedMovieInclude,
  })
  return movie ? formatWatchedMovie(movie, userId) : null
}

// POST /api/watched-reactions — set or update your one-line reaction to a watched movie
router.post('/', requireAuth, async (req, res) => {
  const { movieId, text } = req.body

  if (!movieId) return res.status(400).json({ error: 'movieId is required' })
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed || trimmed.length > 140) {
    return res.status(400).json({ error: 'text must be 1-140 characters' })
  }

  const movie = await prisma.movie.findUnique({ where: { id: Number(movieId) } })
  if (!movie || movie.deletedAt) return res.status(404).json({ error: 'Movie not found' })
  if (!movie.watchedAt) return res.status(400).json({ error: 'Movie has not been marked as watched' })

  await prisma.watchedReaction.upsert({
    where: { userId_movieId: { userId: req.user.id, movieId: Number(movieId) } },
    create: { userId: req.user.id, movieId: Number(movieId), text: trimmed },
    update: { text: trimmed },
  })

  const updated = await fetchWatchedMovie(Number(movieId), req.user.id)
  res.json({ movie: updated })
})

// DELETE /api/watched-reactions/:movieId — remove your reaction
router.delete('/:movieId', requireAuth, async (req, res) => {
  const movieId = Number(req.params.movieId)

  const deleted = await prisma.watchedReaction.deleteMany({
    where: { userId: req.user.id, movieId },
  })

  if (deleted.count === 0) return res.status(404).json({ error: 'No reaction found to remove' })

  const updated = await fetchWatchedMovie(movieId, req.user.id)
  res.json({ movie: updated })
})

export default router
