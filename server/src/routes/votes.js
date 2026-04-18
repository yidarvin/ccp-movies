import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { formatMovie } from '../lib/formatMovie.js'

const router = Router()

async function fetchMovie(movieId) {
  return prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      votes: true,
      addedBy: { select: { id: true, username: true } },
    },
  })
}

// POST /api/votes — cast or change a vote
// Body: { movieId: number, value: 1 | -1 }
router.post('/', requireAuth, async (req, res) => {
  const { movieId, value } = req.body

  if (!movieId) {
    return res.status(400).json({ error: 'movieId is required' })
  }

  if (value !== 1 && value !== -1) {
    return res.status(400).json({ error: 'value must be 1 or -1' })
  }

  const movie = await prisma.movie.findUnique({ where: { id: Number(movieId) } })
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' })
  }

  await prisma.vote.upsert({
    where: { userId_movieId: { userId: req.user.id, movieId: Number(movieId) } },
    create: { userId: req.user.id, movieId: Number(movieId), value },
    update: { value },
  })

  const updated = await fetchMovie(Number(movieId))
  res.json({ movie: formatMovie(updated, req.user.id) })
})

// DELETE /api/votes/:movieId — remove your vote
router.delete('/:movieId', requireAuth, async (req, res) => {
  const movieId = Number(req.params.movieId)

  const movie = await prisma.movie.findUnique({ where: { id: movieId } })
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' })
  }

  const deleted = await prisma.vote.deleteMany({
    where: { userId: req.user.id, movieId },
  })

  if (deleted.count === 0) {
    return res.status(404).json({ error: 'No vote found to remove' })
  }

  const updated = await fetchMovie(movieId)
  res.json({ movie: formatMovie(updated, req.user.id) })
})

export default router
