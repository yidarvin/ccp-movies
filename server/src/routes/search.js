import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const TMDB_BASE = 'https://api.themoviedb.org/3'

// TMDB genre name → ID map
const GENRE_NAME_TO_ID = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  'sci-fi': 878,
  'science fiction': 878,
  thriller: 53,
  war: 10752,
  western: 37,
}

// TMDB genre ID → name map (for annotating results)
const GENRE_ID_TO_NAME = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
}

function normalizeTmdbMovie(m) {
  return {
    tmdbId: m.id,
    title: m.title,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    posterPath: m.poster_path || null,
    overview: m.overview || null,
    genres: (m.genre_ids || m.genres?.map((g) => g.id) || [])
      .map((id) => GENRE_ID_TO_NAME[id])
      .filter(Boolean),
    voteAverage: m.vote_average ?? null,
  }
}

// GET /api/search?query=&genre=&page=
// - query + genre  → /search/movie, filter by genre in-process
// - query only     → /search/movie
// - genre only     → /discover/movie with genre filter
router.get('/', requireAuth, async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'TMDB_API_KEY not configured' })
  }

  const query = (req.query.query || '').trim()
  const genreParam = (req.query.genre || '').trim().toLowerCase()
  const page = Math.max(1, Number(req.query.page) || 1)

  // Resolve genre name → TMDB genre ID (also accept raw numeric IDs)
  let genreId = null
  if (genreParam) {
    genreId = GENRE_NAME_TO_ID[genreParam] ?? (Number.isInteger(Number(genreParam)) ? Number(genreParam) : null)
    if (!genreId) {
      return res.status(400).json({ error: `Unknown genre: "${req.query.genre}"` })
    }
  }

  let tmdbUrl
  if (query) {
    tmdbUrl = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`
  } else if (genreId) {
    tmdbUrl = `${TMDB_BASE}/discover/movie?api_key=${apiKey}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
  } else {
    return res.status(400).json({ error: 'Provide at least query or genre' })
  }

  let tmdbData
  try {
    const response = await fetch(tmdbUrl)
    if (!response.ok) {
      const body = await response.text()
      console.error('TMDB error:', response.status, body)
      return res.status(502).json({ error: 'TMDB request failed', detail: response.status })
    }
    tmdbData = await response.json()
  } catch (err) {
    console.error('TMDB fetch error:', err)
    return res.status(502).json({ error: 'Failed to reach TMDB' })
  }

  let results = (tmdbData.results || []).map(normalizeTmdbMovie)

  // If both query and genre provided, filter results by genre
  if (query && genreId) {
    results = results.filter((m) =>
      (tmdbData.results.find((r) => r.id === m.tmdbId)?.genre_ids || []).includes(genreId)
    )
  }

  res.json({
    results,
    page: tmdbData.page,
    totalPages: tmdbData.total_pages,
    totalResults: tmdbData.total_results,
  })
})

export default router
