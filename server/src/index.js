import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import moviesRouter from './routes/movies.js'
import votesRouter from './routes/votes.js'
import searchRouter from './routes/search.js'
import streamingRouter from './routes/streaming.js'
import adminRouter from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/movies', moviesRouter)
app.use('/api/votes', votesRouter)
app.use('/api/search', searchRouter)
app.use('/api/streaming', streamingRouter)
app.use('/api/admin', adminRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
