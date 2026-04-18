import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const STREAMING_BASE = 'https://streaming-availability.p.rapidapi.com'

// GET /api/streaming/:tmdbId
// Proxies to Streaming Availability API (RapidAPI).
// Returns normalized US platform list plus raw streamingInfo for other countries.
router.get('/:tmdbId', requireAuth, async (req, res) => {
  const rapidApiKey = process.env.STREAMING_API_KEY
  if (!rapidApiKey) {
    return res.status(503).json({ error: 'STREAMING_API_KEY not configured' })
  }

  const tmdbId = Number(req.params.tmdbId)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return res.status(400).json({ error: 'Invalid tmdbId' })
  }

  let data
  try {
    const response = await fetch(
      `${STREAMING_BASE}/shows/movie/${tmdbId}?series_granularity=show&output_language=en`,
      {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'streaming-availability.p.rapidapi.com',
        },
      }
    )

    if (response.status === 404) {
      return res.json({ tmdbId, platforms: [], streamingInfo: {} })
    }

    if (!response.ok) {
      const body = await response.text()
      console.error('Streaming API error:', response.status, body)
      return res.status(502).json({ error: 'Streaming Availability request failed', detail: response.status })
    }

    data = await response.json()
  } catch (err) {
    console.error('Streaming API fetch error:', err)
    return res.status(502).json({ error: 'Failed to reach Streaming Availability API' })
  }

  // Normalize: extract US subscription/free platforms for easy consumption
  const usStreaming = data.streamingOptions?.us || []
  const platforms = usStreaming
    .filter((s) => s.type === 'subscription' || s.type === 'free')
    .map((s) => ({ service: s.service.id, type: s.type, link: s.link || null }))
    .filter((s, i, arr) => arr.findIndex((x) => x.service === s.service) === i)

  res.json({
    tmdbId,
    platforms,
    streamingInfo: data.streamingInfo || {},
  })
})

export default router
