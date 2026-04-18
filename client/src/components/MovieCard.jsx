import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import toast from 'react-hot-toast'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

function VoteButton({ direction, active, disabled, onClick }) {
  const isUp = direction === 'up'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={isUp ? 'Upvote' : 'Downvote'}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg border transition-all disabled:opacity-40
        ${active
          ? isUp
            ? 'bg-amber-400 border-amber-400 text-zinc-950'
            : 'bg-red-500 border-red-500 text-white'
          : isUp
            ? 'border-zinc-700 text-zinc-400 hover:border-amber-400 hover:text-amber-400 bg-transparent'
            : 'border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-red-400 bg-transparent'
        }
      `}
    >
      <svg
        className="w-3.5 h-3.5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
      >
        {isUp
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        }
      </svg>
    </button>
  )
}

export default function MovieCard({ movie, onUpdate, onDelete }) {
  const { user } = useAuth()
  const [voting, setVoting] = useState(false)

  async function vote(value) {
    if (voting) return
    const next = movie.userVote === value ? 0 : value

    // ── Optimistic update ─────────────────────────────────────────
    const optimistic = {
      ...movie,
      userVote: next,
      netVotes: movie.netVotes - (movie.userVote || 0) + next,
    }
    onUpdate(optimistic)
    setVoting(true)

    try {
      const res = next === 0
        ? await api.delete(`/votes/${movie.id}`)
        : await api.post('/votes', { movieId: movie.id, value: next })
      // Reconcile with server truth (in case of race conditions)
      onUpdate(res.data.movie)
    } catch (err) {
      // Revert on error
      onUpdate(movie)
      if (err.response?.status !== 404) {
        toast.error(err.response?.data?.error || 'Vote failed')
      }
    } finally {
      setVoting(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${movie.title}" from the list?`)) return
    try {
      await api.delete(`/movies/${movie.id}`)
      onDelete(movie.id)
      toast.success('Movie removed from the list')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  const score = movie.netVotes
  const scoreCls =
    score > 0 ? 'bg-amber-400 text-zinc-950' :
    score < 0 ? 'bg-red-500 text-white'       :
                'bg-zinc-700 text-zinc-300'

  return (
    <div className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col poster-zoom">
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800">
        {movie.posterPath ? (
          <img
            src={`${TMDB_IMG}${movie.posterPath}`}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">
            🎬
          </div>
        )}

        {/* Score badge */}
        <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-md tabular-nums transition-colors ${scoreCls}`}>
          {score > 0 ? `+${score}` : score}
        </div>

        {/* Admin delete — hover reveal */}
        {user?.isAdmin && (
          <button
            onClick={handleDelete}
            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 bg-zinc-950/80 hover:bg-red-600 text-zinc-400 hover:text-white p-1.5 rounded-lg transition-all"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div>
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
            {movie.title}
          </h3>
          {movie.year && (
            <p className="text-zinc-500 text-xs mt-0.5">{movie.year}</p>
          )}
        </div>

        {/* Genre tags */}
        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-xs text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded-md">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Streaming badges */}
        {movie.streamingPlatforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.streamingPlatforms.map((p) => (
              <span key={p} className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Vote row */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-600 truncate max-w-[55%]">
            {movie.addedBy?.username}
          </span>
          <div className="flex items-center gap-1.5">
            <VoteButton
              direction="up"
              active={movie.userVote === 1}
              disabled={voting}
              onClick={() => vote(1)}
            />
            <VoteButton
              direction="down"
              active={movie.userVote === -1}
              disabled={voting}
              onClick={() => vote(-1)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
