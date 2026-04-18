import { useState, useEffect, useMemo } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import MovieCard from '../components/MovieCard'
import SearchModal from '../components/SearchModal'

const SORT_OPTIONS = [
  { key: 'top',    label: 'Top Voted' },
  { key: 'recent', label: 'Recently Added' },
  { key: 'voted',  label: 'Recently Voted' },
]

// ── Skeleton card matches MovieCard's aspect ratio and info layout ─
function MovieCardSkeleton() {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex flex-col animate-pulse">
      <div className="aspect-[2/3] bg-zinc-800" />
      <div className="p-3 space-y-2.5">
        <div className="space-y-1.5">
          <div className="h-3.5 bg-zinc-800 rounded w-4/5" />
          <div className="h-3 bg-zinc-800 rounded w-1/3" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-zinc-800 rounded-md" />
          <div className="h-5 w-12 bg-zinc-800 rounded-md" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-16 bg-zinc-800 rounded" />
          <div className="flex gap-1.5">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
            <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reusable genre/platform Select ────────────────────────────────
function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full sm:w-auto bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 cursor-pointer appearance-none pr-7"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundPosition: 'right 8px center',
        backgroundSize: '13px',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [movies, setMovies]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sortBy, setSortBy]       = useState('top')
  const [genreFilter, setGenre]   = useState('')
  const [platFilter, setPlat]     = useState('')
  const [search, setSearch]       = useState('')

  useEffect(() => {
    api.get('/movies')
      .then((r) => setMovies(r.data.movies))
      .catch(() => toast.error('Failed to load movies'))
      .finally(() => setLoading(false))
  }, [])

  function handleUpdate(updated) {
    setMovies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }
  function handleDelete(id) {
    setMovies((prev) => prev.filter((m) => m.id !== id))
  }
  function handleAdded(movie) {
    setMovies((prev) => [movie, ...prev])
    toast.success(`"${movie.title}" added!`)
  }

  // Derive filter options from loaded movies
  const allGenres = useMemo(() => {
    const s = new Set()
    movies.forEach((m) => m.genres.forEach((g) => s.add(g)))
    return [...s].sort()
  }, [movies])

  const allPlatforms = useMemo(() => {
    const s = new Set()
    movies.forEach((m) => m.streamingPlatforms.forEach((p) => s.add(p)))
    return [...s].sort()
  }, [movies])

  // Sort
  const sorted = useMemo(() => {
    const list = [...movies]
    if (sortBy === 'top')    return list.sort((a, b) => b.netVotes - a.netVotes)
    if (sortBy === 'recent') return list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    if (sortBy === 'voted') {
      const withVote    = list.filter((m) => m.lastVotedAt).sort((a, b) => new Date(b.lastVotedAt) - new Date(a.lastVotedAt))
      const withoutVote = list.filter((m) => !m.lastVotedAt)
      return [...withVote, ...withoutVote]
    }
    return list
  }, [movies, sortBy])

  // Filter + search
  const visible = useMemo(
    () =>
      sorted.filter((m) => {
        if (genreFilter && !m.genres.includes(genreFilter))                     return false
        if (platFilter  && !m.streamingPlatforms.includes(platFilter))          return false
        if (search.trim() && !m.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [sorted, genreFilter, platFilter, search]
  )

  const existingTmdbIds = useMemo(
    () => new Set(movies.filter((m) => m.tmdbId).map((m) => m.tmdbId)),
    [movies]
  )

  const hasActiveFilter = genreFilter || platFilter || search.trim()

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar onAddMovie={() => setShowModal(true)} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Row 1: sort tabs */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit min-w-full sm:min-w-0">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    sortBy === key
                      ? 'bg-amber-400 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: filters + search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <FilterSelect
              value={genreFilter}
              onChange={setGenre}
              options={allGenres}
              placeholder="All genres"
            />
            <FilterSelect
              value={platFilter}
              onChange={setPlat}
              options={allPlatforms}
              placeholder="All platforms"
            />
            {hasActiveFilter && (
              <button
                onClick={() => { setGenre(''); setPlat(''); setSearch('') }}
                className="text-xs text-zinc-500 hover:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-800 self-start sm:self-auto"
              >
                Clear filters
              </button>
            )}

            {/* Search — pushed right on desktop */}
            <div className="sm:ml-auto relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search list…"
                className="w-full sm:w-52 bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <p className="text-zinc-600 text-xs mb-4 tabular-nums">
            {visible.length !== movies.length
              ? `${visible.length} of ${movies.length} movies`
              : `${movies.length} movie${movies.length !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* Grid — skeletons while loading */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {loading
            ? Array.from({ length: 12 }, (_, i) => <MovieCardSkeleton key={i} />)
            : visible.length === 0
            ? null
            : visible.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
          }
        </div>

        {/* Empty state */}
        {!loading && visible.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🍿</div>
            <p className="text-zinc-400 text-lg mb-2">
              {movies.length === 0
                ? 'No movies yet — add the first one!'
                : 'No movies match your filters.'}
            </p>
            {movies.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                Add a movie
              </button>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <SearchModal
          existingTmdbIds={existingTmdbIds}
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}
