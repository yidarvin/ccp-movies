import { useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185'

const STREAMING_PLATFORMS = [
  'Netflix',
  'Disney+',
  'Hulu',
  'Max',
  'Prime Video',
  'Apple TV+',
  'Peacock',
  'Paramount+',
  'Tubi',
]

export default function AddMovieModal({ onClose, onAdded }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [adding, setAdding] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualForm, setManualForm] = useState({ title: '', year: '' })

  async function searchTMDB() {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=&query=${encodeURIComponent(query)}`
      )
      // If TMDB key is not configured, fall back to manual-only mode
      if (!res.ok) throw new Error('TMDB unavailable')
      const data = await res.json()
      setResults(data.results?.slice(0, 8) || [])
    } catch {
      toast.error('TMDB search unavailable — use manual entry below')
      setManualMode(true)
    } finally {
      setSearching(false)
    }
  }

  function selectResult(movie) {
    setSelected(movie)
  }

  function togglePlatform(p) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  async function handleAdd() {
    setAdding(true)
    try {
      let payload
      if (manualMode) {
        if (!manualForm.title.trim()) {
          toast.error('Title is required')
          return
        }
        payload = {
          title: manualForm.title.trim(),
          year: manualForm.year ? Number(manualForm.year) : undefined,
          streamingPlatforms: platforms,
        }
      } else if (selected) {
        const genres =
          selected.genre_ids
            ?.map((id) => GENRE_MAP[id])
            .filter(Boolean) || []
        payload = {
          tmdbId: selected.id,
          title: selected.title,
          year: selected.release_date ? Number(selected.release_date.slice(0, 4)) : undefined,
          posterPath: selected.poster_path || undefined,
          genres,
          streamingPlatforms: platforms,
        }
      } else {
        toast.error('Select a movie or use manual entry')
        return
      }

      const res = await api.post('/movies', payload)
      onAdded(res.data.movie)
      toast.success(`"${res.data.movie.title}" added!`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add movie')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Add a Movie</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!manualMode ? (
            <>
              {/* TMDB Search */}
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchTMDB()}
                  placeholder="Search for a movie…"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <button
                  onClick={searchTMDB}
                  disabled={searching || !query.trim()}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {searching ? '…' : 'Search'}
                </button>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {results.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => selectResult(movie)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl border transition-colors text-left ${
                        selected?.id === movie.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-gray-800 hover:border-gray-700 bg-gray-800/50'
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-14 rounded-md overflow-hidden bg-gray-700">
                        {movie.poster_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE}${movie.poster_path}`}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">🎬</div>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm line-clamp-1">{movie.title}</p>
                        <p className="text-gray-400 text-xs">
                          {movie.release_date ? movie.release_date.slice(0, 4) : 'Unknown year'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setManualMode(true)}
                className="text-sm text-gray-400 hover:text-gray-300 underline"
              >
                Add manually instead
              </button>
            </>
          ) : (
            <>
              {/* Manual entry */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                  <input
                    value={manualForm.title}
                    onChange={(e) => setManualForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Movie title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
                  <input
                    value={manualForm.year}
                    onChange={(e) => setManualForm((f) => ({ ...f, year: e.target.value }))}
                    type="number"
                    min="1900"
                    max="2030"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="2024"
                  />
                </div>
              </div>

              <button
                onClick={() => { setManualMode(false); setSelected(null) }}
                className="text-sm text-gray-400 hover:text-gray-300 underline"
              >
                Back to search
              </button>
            </>
          )}

          {/* Streaming platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Available on <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {STREAMING_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    platforms.includes(p)
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleAdd}
            disabled={adding || (!selected && !manualMode) || (manualMode && !manualForm.title.trim())}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 transition-colors"
          >
            {adding ? 'Adding…' : 'Add to list'}
          </button>
        </div>
      </div>
    </div>
  )
}

// TMDB genre ID map (common ones)
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}
