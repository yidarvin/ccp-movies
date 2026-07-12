import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const username = (req.body.username || '').trim()
  const password = (req.body.password || '').trim()
  const inviteCode = (req.body.inviteCode || '').trim()

  if (!username || !password || !inviteCode) {
    return res.status(400).json({ error: 'username, password, and inviteCode are required' })
  }

  if (inviteCode.toUpperCase() !== (process.env.INVITE_CODE || '').trim().toUpperCase()) {
    return res.status(403).json({ error: 'Invalid invite code' })
  }

  if (username.length < 2 || username.length > 32) {
    return res.status(400).json({ error: 'Username must be 2–32 characters' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username, passwordHash, isAdmin: false },
  })

  const token = signToken(user)
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
  })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const username = (req.body.username || '').trim()
  const password = (req.body.password || '').trim()

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = signToken(user)
  res.json({
    token,
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
  })
})

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const currentPassword = (req.body.currentPassword || '').trim()
  const newPassword = (req.body.newPassword || '').trim()

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  // Existing JWTs remain valid until their 7-day expiry — no token versioning, fine for this app.
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  res.json({ success: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, isAdmin: true, createdAt: true },
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ user })
})

export default router
