const STREAMING_BASE = 'https://streaming-availability.p.rapidapi.com'

/**
 * Fetches US streaming availability for a TMDB movie ID.
 * Returns null if STREAMING_API_KEY is not set.
 * Returns { platforms: string[], streamingInfo: object[] } on success.
 * Throws on network / API errors so callers can decide how to handle them.
 */
export async function fetchStreamingData(tmdbId) {
  const apiKey = process.env.STREAMING_API_KEY
  if (!apiKey) return null

  const response = await fetch(
    `${STREAMING_BASE}/shows/movie/${tmdbId}?series_granularity=show&output_language=en`,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'streaming-availability.p.rapidapi.com',
      },
    }
  )

  if (response.status === 404) {
    return { platforms: [], streamingInfo: [] }
  }

  if (!response.ok) {
    throw new Error(`Streaming API returned ${response.status}`)
  }

  const data = await response.json()
  const usOptions = data.streamingOptions?.us || []

  const streamingInfo = usOptions
    .filter((s) => s.type === 'subscription' || s.type === 'free')
    .filter((s, i, arr) => arr.findIndex((x) => x.service.id === s.service.id) === i)
    .map((s) => ({
      service: s.service.id,
      name:    s.service.name || s.service.id,
      type:    s.type,
      link:    s.link || null,
    }))

  return {
    platforms:     streamingInfo.map((s) => s.service),
    streamingInfo,
  }
}
