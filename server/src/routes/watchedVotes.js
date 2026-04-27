import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { formatWatchedMovie } from '../lib/formatMovie.js'

const router = Router()

async function fetchWatchedMovie(movieId, userId) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      watchedVotes: {
        include: { user: { select: { id: true, username: true } } },
      },
      addedBy: { select: { id: true, username: true } },
    },
  })
  return movie ? formatWatchedMovie(movie, userId) : null
}

// POST /api/watched-votes — cast or change a thumbs UP/DOWN on a watched movie
router.post('/', requireAuth, async (req, res) => {
  const { movieId, vote } = req.body

  if (!movieId) return res.status(400).json({ error: 'movieId is required' })
  if (vote !== 'UP' && vote !== 'DOWN') return res.status(400).json({ error: 'vote must be UP or DOWN' })

  const movie = await prisma.movie.findUnique({ where: { id: Number(movieId) } })
  if (!movie) return res.status(404).json({ error: 'Movie not found' })
  if (!movie.watchedAt) return res.status(400).json({ error: 'Movie has not been marked as watched' })

  await prisma.watchedVote.upsert({
    where: { userId_movieId: { userId: req.user.id, movieId: Number(movieId) } },
    create: { userId: req.user.id, movieId: Number(movieId), vote },
    update: { vote },
  })

  const updated = await fetchWatchedMovie(Number(movieId), req.user.id)
  res.json({ movie: updated })
})

// DELETE /api/watched-votes/:movieId — remove your thumbs vote
router.delete('/:movieId', requireAuth, async (req, res) => {
  const movieId = Number(req.params.movieId)

  const deleted = await prisma.watchedVote.deleteMany({
    where: { userId: req.user.id, movieId },
  })

  if (deleted.count === 0) return res.status(404).json({ error: 'No vote found to remove' })

  const updated = await fetchWatchedMovie(movieId, req.user.id)
  res.json({ movie: updated })
})

export default router
