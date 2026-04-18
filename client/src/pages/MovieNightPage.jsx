import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'
const TOP_N    = 5

// ── Single mystery / revealed card ────────────────────────────────
function MovieNightCard({ movie, rank, revealed, isWinner }) {
  const [streaming, setStreaming] = useState(null)
  const cardRef = useRef(null)

  // Fetch streaming for the winner once revealed
  useEffect(() => {
    if (!revealed || !isWinner) return
    if (!movie.tmdbId && movie.streamingPlatforms.length === 0) return

    if (movie.streamingPlatforms.length > 0) {
      // Already stored on the movie object
      setStreaming(movie.streamingPlatforms.map((s) => ({ service: s })))
      return
    }
    if (movie.tmdbId) {
      api.get(`/streaming/${movie.tmdbId}`)
        .then((r) => setStreaming(r.data.platforms))
        .catch(() => setStreaming([]))
    }
  }, [revealed, isWinner, movie.tmdbId, movie.streamingPlatforms])

  // Pulse animation class applied once on reveal
  const [pulsed, setPulsed] = useState(false)
  useEffect(() => {
    if (revealed && isWinner && !pulsed) {
      setPulsed(true)
    }
  }, [revealed, isWinner, pulsed])

  const rankLabel  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
  const scoreColor = movie.netVotes > 0 ? 'text-amber-400' : movie.netVotes < 0 ? 'text-red-400' : 'text-zinc-400'

  return (
    <div
      ref={cardRef}
      className={`relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ${
        isWinner && revealed
          ? 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.25)]'
          : revealed
          ? 'border-zinc-700'
          : 'border-zinc-800'
      } ${pulsed ? 'animate-gold-pulse' : ''}`}
    >
      {/* Poster area */}
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
        {/* Real poster (always rendered, blurred when hidden) */}
        {movie.posterPath ? (
          <img
            src={`${TMDB_IMG}${movie.posterPath}`}
            alt={movie.title}
            className={`w-full h-full object-cover transition-all duration-700 ${
              revealed ? 'blur-0 grayscale-0 brightness-100 scale-100' : 'blur-2xl grayscale brightness-50 scale-110'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-5xl">🎬</div>
        )}

        {/* Mystery overlay */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 transition-opacity duration-700 ${
            revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <span className="text-5xl font-black text-zinc-700 leading-none">?</span>
          <span className="text-amber-400 font-black text-3xl mt-1">{rankLabel}</span>
        </div>

        {/* Rank badge (visible after reveal) */}
        {revealed && (
          <div className={`absolute top-2 left-2 text-sm font-bold px-2 py-1 rounded-lg animate-reveal-scale ${
            isWinner ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-200'
          }`}>
            {rankLabel}
          </div>
        )}

        {/* Score badge */}
        {revealed && (
          <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-md bg-zinc-950/80 tabular-nums ${scoreColor}`}>
            {movie.netVotes > 0 ? `+${movie.netVotes}` : movie.netVotes}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className={`p-3 transition-all duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className={`font-bold leading-tight line-clamp-2 ${isWinner ? 'text-white text-base' : 'text-zinc-200 text-sm'}`}>
          {revealed ? movie.title : '???'}
        </h3>
        {movie.year && revealed && (
          <p className="text-zinc-500 text-xs mt-0.5">{movie.year}</p>
        )}

        {/* Streaming (winner only) */}
        {isWinner && revealed && (
          <div className="mt-2">
            {streaming === null && <p className="text-xs text-zinc-600">Checking platforms…</p>}
            {streaming !== null && streaming.length === 0 && (
              <p className="text-xs text-zinc-600">No streaming info</p>
            )}
            {streaming !== null && streaming.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {streaming.map((p) => (
                  <span key={p.service} className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-lg font-medium">
                    {p.service}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function MovieNightPage() {
  const [movies, setMovies]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [revealedCount, setCount] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    api.get('/movies')
      .then((r) => setMovies(r.data.movies))
      .catch(() => toast.error('Failed to load movies'))
      .finally(() => setLoading(false))
  }, [])

  // Top N sorted by votes
  const top = [...movies]
    .sort((a, b) => b.netVotes - a.netVotes)
    .slice(0, TOP_N)

  // Cards shown in display order: #5, #4, #3, #2, #1 (dramatic countdown)
  const displayOrder = [...top].reverse()

  function revealNext() {
    if (animating || revealedCount >= displayOrder.length) return
    setAnimating(true)
    setCount((c) => c + 1)
    setTimeout(() => setAnimating(false), 800)
  }

  function resetReveal() {
    setCount(0)
  }

  const allRevealed = revealedCount >= displayOrder.length
  const winner      = top[0]

  // How many are revealed in the display order (right-to-left = #1 last)
  // displayOrder[0] = rank TOP_N, displayOrder[last] = rank 1
  // We reveal from index 0 upward, so rank #5 reveals first, #1 last
  function isRevealed(displayIdx) {
    return displayIdx < revealedCount
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            🐱 Chonky Cat Movies
          </h1>
          <p className="text-zinc-400">
            {movies.length === 0
              ? 'No movies have been voted on yet.'
              : `Top ${Math.min(TOP_N, top.length)} picks from ${movies.length} movies`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : top.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🗳️</div>
            <p className="text-zinc-400 mb-4">No votes yet — go vote on some movies first!</p>
            <Link
              to="/"
              className="inline-block bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Go to list
            </Link>
          </div>
        ) : (
          <>
            {/* Cards */}
            <div className={`grid gap-4 mb-10 ${
              displayOrder.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
              displayOrder.length === 2 ? 'grid-cols-2 max-w-sm mx-auto' :
              displayOrder.length === 3 ? 'grid-cols-3 max-w-lg mx-auto' :
              displayOrder.length === 4 ? 'grid-cols-4 max-w-2xl mx-auto' :
              'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
            }`}>
              {displayOrder.map((movie, displayIdx) => {
                const rank = top.length - displayIdx  // 5 → 4 → 3 → 2 → 1
                return (
                  <MovieNightCard
                    key={movie.id}
                    movie={movie}
                    rank={rank}
                    revealed={isRevealed(displayIdx)}
                    isWinner={rank === 1}
                  />
                )
              })}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-center gap-4">
              {!allRevealed ? (
                <button
                  onClick={revealNext}
                  disabled={animating}
                  className="relative bg-amber-400 hover:bg-amber-300 disabled:opacity-70 text-zinc-950 font-black text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                >
                  {revealedCount === 0
                    ? `Reveal #${displayOrder.length}`
                    : revealedCount === displayOrder.length - 1
                    ? '🏆 Reveal the Winner!'
                    : `Reveal #${displayOrder.length - revealedCount}`
                  }
                </button>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-2xl font-black text-white">
                    🏆 Tonight's pick: <span className="text-amber-400">{winner?.title}</span>
                  </div>
                  <button
                    onClick={resetReveal}
                    className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors border border-zinc-700"
                  >
                    ↺ Reset reveal
                  </button>
                </div>
              )}

              {revealedCount > 0 && !allRevealed && (
                <button
                  onClick={resetReveal}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
