import { useState, useRef } from 'react'
import api from '../api'
import toast from 'react-hot-toast'

const TMDB_IMG     = 'https://image.tmdb.org/t/p/w185'
const GENRE_OPTIONS = [
  'Action','Adventure','Animation','Comedy','Crime','Documentary',
  'Drama','Family','Fantasy','History','Horror','Music','Mystery',
  'Romance','Sci-Fi','Thriller','War','Western',
]

// ── Single result card ─────────────────────────────────────────────
function ResultCard({ result, isAdded, onAdd }) {
  const [streaming, setStreaming] = useState(null)   // null | 'loading' | platform[]
  const [adding, setAdding]       = useState(false)

  async function fetchStreaming() {
    if (!result.tmdbId) return
    setStreaming('loading')
    try {
      const res = await api.get(`/streaming/${result.tmdbId}`)
      setStreaming(res.data.platforms)
    } catch {
      setStreaming([])
    }
  }

  async function handleAdd() {
    setAdding(true)
    try {
      const platforms = Array.isArray(streaming)
        ? streaming.map((p) => p.service)
        : []
      const res = await api.post('/movies', {
        tmdbId:             result.tmdbId,
        title:              result.title,
        year:               result.year,
        posterPath:         result.posterPath,
        genres:             result.genres,
        overview:           result.overview || null,
        streamingPlatforms: platforms,
      })
      toast.success(`"${res.data.movie.title}" added to the list!`)
      onAdd(res.data.movie)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add movie')
      setAdding(false)
    }
  }

  return (
    <div className={`flex gap-3 p-3 rounded-xl border transition-colors ${
      isAdded ? 'border-zinc-700 bg-zinc-800/30 opacity-60' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
    }`}>
      {/* Poster */}
      <div className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-zinc-800">
        {result.posterPath ? (
          <img
            src={`${TMDB_IMG}${result.posterPath}`}
            alt={result.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xl">🎬</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
        <div>
          <p className="text-white font-medium text-sm line-clamp-1">{result.title}</p>
          <p className="text-zinc-500 text-xs">{result.year ?? '—'}</p>
          {result.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {result.genres.slice(0, 3).map((g) => (
                <span key={g} className="text-xs text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Streaming row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {streaming === null && !isAdded && (
              <button
                onClick={fetchStreaming}
                className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
              >
                Check platforms →
              </button>
            )}
            {streaming === 'loading' && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
                Checking…
              </div>
            )}
            {Array.isArray(streaming) && (
              streaming.length === 0
                ? <span className="text-xs text-zinc-600">Not streaming</span>
                : <div className="flex flex-wrap gap-1">
                    {streaming.map((p) => (
                      <span key={p.service} className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                        {p.service}
                      </span>
                    ))}
                  </div>
            )}
          </div>

          {isAdded ? (
            <span className="text-xs text-zinc-500 flex-shrink-0">Already added</span>
          ) : (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              {adding ? '…' : '+ Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────
export default function SearchModal({ existingTmdbIds, onClose, onAdded }) {
  const [query, setQuery]     = useState('')
  const [genre, setGenre]     = useState('')
  const [results, setResults] = useState(null)   // null = not searched yet
  const [page, setPage]       = useState(1)
  const [totalPages, setTotal] = useState(1)
  const [searching, setSearching] = useState(false)
  const [addedIds, setAddedIds]   = useState(new Set())
  const inputRef = useRef(null)

  async function doSearch(p = 1) {
    if (!query.trim() && !genre) return
    setSearching(true)
    try {
      const params = new URLSearchParams({ page: p })
      if (query.trim()) params.set('query', query.trim())
      if (genre)        params.set('genre', genre)
      const res = await api.get(`/search?${params}`)
      setResults(res.data.results)
      setPage(res.data.page)
      setTotal(res.data.totalPages)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') doSearch(1)
  }

  function handleAdded(movie) {
    setAddedIds((s) => new Set([...s, movie.tmdbId]))
    onAdded(movie)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-white font-semibold text-lg">Add a Movie</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search controls */}
        <div className="p-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search by title…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
              />
            </div>

            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer min-w-[120px]"
            >
              <option value="">All genres</option>
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <button
              onClick={() => doSearch(1)}
              disabled={searching || (!query.trim() && !genre)}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-950 font-bold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
            >
              {searching
                ? <div className="w-5 h-5 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
                : 'Search'
              }
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {results === null ? (
            <div className="text-center py-16 text-zinc-500">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">Search for a movie to add it to the list</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-sm">No results found.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {results.map((r) => (
                  <ResultCard
                    key={r.tmdbId}
                    result={r}
                    isAdded={existingTmdbIds.has(r.tmdbId) || addedIds.has(r.tmdbId)}
                    onAdd={handleAdded}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => doSearch(page - 1)}
                    disabled={page <= 1 || searching}
                    className="text-sm text-zinc-400 hover:text-white disabled:opacity-30 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-zinc-500">
                    Page {page} of {Math.min(totalPages, 500)}
                  </span>
                  <button
                    onClick={() => doSearch(page + 1)}
                    disabled={page >= totalPages || searching}
                    className="text-sm text-zinc-400 hover:text-white disabled:opacity-30 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
