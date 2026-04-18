import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/admin/users — all users with movie/vote counts
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { movies: true, votes: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ users })
})

export default router
