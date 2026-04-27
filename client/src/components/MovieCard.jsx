import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import toast from 'react-hot-toast'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

function relativeTime(isoDate) {
  const secs = Math.floor((Date.now() - new Date(isoDate)) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function fmtRuntime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

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

export default function MovieCard({ movie, onUpdate, onDelete, onWatched }) {
  const { user }  = useAuth()
  const [expanded,   setExpanded]   = useState(false)
  const [voting,     setVoting]     = useState(false)
  const [watching,   setWatching]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function vote(value) {
    if (voting) return
    const next = movie.userVote === value ? 0 : value
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
      onUpdate(res.data.movie)
    } catch (err) {
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

  async function handleWatch() {
    if (watching) return
    setWatching(true)
    try {
      const res = await api.patch(`/movies/${movie.id}/watch`)
      onWatched(res.data.movie)
      toast.success(`"${movie.title}" marked as watched!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark as watched')
    } finally {
      setWatching(false)
    }
  }

  async function handleRefreshStreaming(e) {
    e.stopPropagation()
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await api.post(`/movies/${movie.id}/refresh-streaming`)
      onUpdate(res.data.movie)
      toast.success('Streaming info updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to refresh streaming')
    } finally {
      setRefreshing(false)
    }
  }

  const score    = movie.netVotes
  const scoreCls =
    score > 0 ? 'bg-amber-400 text-zinc-950' :
    score < 0 ? 'bg-red-500 text-white'       :
                'bg-zinc-700 text-zinc-300'

  const streamingAge = movie.streamingUpdatedAt ? relativeTime(movie.streamingUpdatedAt) : null
  const runtimeStr   = movie.runtime ? fmtRuntime(movie.runtime) : null

  return (
    <div
      className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col cursor-pointer select-none"
      onClick={() => setExpanded((v) => !v)}
    >
      {/* ── Poster ─────────────────────────────────────────────── */}
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800 flex-shrink-0">
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
        <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-md tabular-nums ${scoreCls}`}>
          {score > 0 ? `+${score}` : score}
        </div>

        {/* Admin delete — stops propagation so it doesn't toggle expand */}
        {user?.isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete() }}
            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 bg-zinc-950/80 hover:bg-red-600 text-zinc-400 hover:text-white p-1.5 rounded-lg transition-all"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Info ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3 gap-2">

        {/* Title + year + chevron */}
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
              {movie.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {movie.year && (
                <span className="text-zinc-500 text-xs">{movie.year}</span>
              )}
              {runtimeStr && (
                <span className="text-zinc-600 text-xs">{runtimeStr}</span>
              )}
            </div>
          </div>
          {/* Expand chevron */}
          <svg
            className={`w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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

        {/* Streaming badges (collapsed) */}
        {!expanded && movie.streamingPlatforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.streamingPlatforms.map((p) => (
              <span key={p} className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                {p}
              </span>
            ))}
          </div>
        )}

        {/* ── Expanded panel ────────────────────────────────────── */}
        {expanded && (
          <div className="border-t border-zinc-800/80 pt-2 space-y-2.5">

            {/* Overview */}
            {movie.overview ? (
              <p className="text-zinc-400 text-xs leading-relaxed line-clamp-5">
                {movie.overview}
              </p>
            ) : (
              <p className="text-zinc-700 text-xs italic">No overview available</p>
            )}

            {/* Where to Stream */}
            <div className="space-y-1">
              <p className="text-zinc-600 text-xs font-medium tracking-wide uppercase" style={{ fontSize: '10px' }}>
                Where to Stream
              </p>
              {movie.streamingInfo.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {movie.streamingInfo.map((s) =>
                    s.link ? (
                      <a
                        key={s.service}
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={s.type === 'free' ? 'Free' : 'Subscription'}
                        className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md hover:bg-amber-400/25 transition-colors"
                      >
                        {s.name}
                        {s.type === 'free' && <span className="ml-0.5 text-amber-400/60">†</span>}
                      </a>
                    ) : (
                      <span
                        key={s.service}
                        className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md"
                      >
                        {s.name}
                        {s.type === 'free' && <span className="ml-0.5 text-amber-400/60">†</span>}
                      </span>
                    )
                  )}
                  <span className="text-xs text-zinc-700 self-center ml-0.5">† free</span>
                </div>
              ) : (
                <p className="text-zinc-700 text-xs">
                  {streamingAge ? 'Not streaming in US' : 'Not yet fetched'}
                </p>
              )}
            </div>

            {/* Last updated + refresh */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-700" style={{ fontSize: '10px' }}>
                {streamingAge ? `Updated ${streamingAge}` : 'Streaming not yet fetched'}
              </span>
              {movie.tmdbId && (
                <button
                  onClick={handleRefreshStreaming}
                  disabled={refreshing}
                  title="Refresh streaming info"
                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-40 px-1 py-0.5 rounded"
                >
                  <svg
                    className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span style={{ fontSize: '10px' }}>Refresh</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Vote row — stopPropagation so clicks here don't toggle expand ── */}
        <div
          className="mt-auto flex items-center justify-between pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-zinc-600 truncate max-w-[45%]">
            {movie.addedBy?.username}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Mark as watched */}
            <button
              onClick={handleWatch}
              disabled={watching}
              title="Mark as watched"
              className="flex items-center justify-center w-8 h-8 rounded-lg border transition-all disabled:opacity-40 border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 bg-transparent"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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
