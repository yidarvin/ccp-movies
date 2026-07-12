import { useState, useRef } from 'react'
import api from '../api'
import toast from 'react-hot-toast'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

export default function WatchedMovieCard({ movie, onUpdate, onUnwatch }) {
  const [voting, setVoting] = useState(false)
  const [unwatching, setUnwatching] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const dateSaveGuard = useRef(false)

  async function handleUnwatch() {
    if (unwatching) return
    setUnwatching(true)
    try {
      await onUnwatch(movie.id)
    } finally {
      setUnwatching(false)
    }
  }

  function openNoteEditor() {
    setNoteText(movie.userReaction ?? '')
    setEditingNote(true)
  }

  async function handleNoteSubmit() {
    const trimmed = noteText.trim()
    if (!trimmed && !movie.userReaction) {
      setEditingNote(false)
      return
    }
    setSavingNote(true)
    try {
      const res = trimmed
        ? await api.post('/watched-reactions', { movieId: movie.id, text: trimmed })
        : await api.delete(`/watched-reactions/${movie.id}`)
      onUpdate(res.data.movie)
      setEditingNote(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  function openDateEditor() {
    dateSaveGuard.current = false
    setEditingDate(true)
  }

  function cancelDateEdit() {
    dateSaveGuard.current = true
    setEditingDate(false)
  }

  async function saveDate(value) {
    if (dateSaveGuard.current) return
    dateSaveGuard.current = true
    setEditingDate(false)
    if (!value || value === movie.watchedAt.slice(0, 10)) return
    try {
      const res = await api.patch(`/movies/${movie.id}/watched-date`, { watchedAt: value })
      onUpdate(res.data.movie)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update date')
    }
  }

  async function vote(direction) {
    if (voting) return
    const isToggleOff = movie.userWatchedVote === direction
    setVoting(true)
    try {
      const res = isToggleOff
        ? await api.delete(`/watched-votes/${movie.id}`)
        : await api.post('/watched-votes', { movieId: movie.id, vote: direction })
      onUpdate(res.data.movie)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Vote failed')
    } finally {
      setVoting(false)
    }
  }

  const watchedDate = new Date(movie.watchedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col">
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
        {/* Move back to list */}
        <button
          onClick={handleUnwatch}
          disabled={unwatching}
          title="Move back to list"
          className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-950/80 text-zinc-400 hover:text-amber-400 transition-colors disabled:opacity-40"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
        {/* Watched date overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950/90 to-transparent px-2 pt-6 pb-2">
          {editingDate ? (
            <input
              type="date"
              defaultValue={movie.watchedAt.slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
              autoFocus
              onBlur={(e) => saveDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveDate(e.target.value) }
                if (e.key === 'Escape') { e.preventDefault(); cancelDateEdit() }
              }}
              className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-200 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          ) : (
            <button
              onClick={openDateEditor}
              title="Edit watch date"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {watchedDate}
            </button>
          )}
        </div>
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

        {/* Vote tallies with usernames */}
        <div className="space-y-1 text-xs min-h-[2rem]">
          {movie.thumbsUp.length > 0 && (
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-emerald-400 font-semibold shrink-0">👍 {movie.thumbsUp.length}</span>
              <span className="text-zinc-600">{movie.thumbsUp.join(', ')}</span>
            </div>
          )}
          {movie.thumbsDown.length > 0 && (
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-red-400 font-semibold shrink-0">👎 {movie.thumbsDown.length}</span>
              <span className="text-zinc-600">{movie.thumbsDown.join(', ')}</span>
            </div>
          )}
          {movie.thumbsUp.length === 0 && movie.thumbsDown.length === 0 && (
            <p className="text-zinc-700">No votes yet</p>
          )}
        </div>

        {/* Reactions */}
        <div className="space-y-1">
          {movie.reactions?.length > 0 && (
            <div className="space-y-0.5">
              {movie.reactions.map((r) => (
                <p key={r.userId} className="text-xs text-zinc-500 italic">
                  "{r.text}" <span className="text-zinc-700 not-italic">— {r.username}</span>
                </p>
              ))}
            </div>
          )}
          {editingNote ? (
            <div className="flex items-center gap-1">
              <input
                maxLength={140}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNoteSubmit()
                  if (e.key === 'Escape') setEditingNote(false)
                }}
                autoFocus
                placeholder="One-line reaction…"
                className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <button
                onClick={handleNoteSubmit}
                disabled={savingNote}
                className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={openNoteEditor}
              className="text-xs text-zinc-600 hover:text-amber-400 transition-colors text-left"
            >
              {movie.userReaction ? 'edit note' : '+ add a note'}
            </button>
          )}
        </div>

        {/* Thumb buttons */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-600 truncate max-w-[55%]">
            {movie.addedBy?.username}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => vote('UP')}
              disabled={voting}
              title="Thumbs up"
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-sm transition-all disabled:opacity-40 ${
                movie.userWatchedVote === 'UP'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'border-zinc-700 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400 bg-transparent'
              }`}
            >
              👍
            </button>
            <button
              onClick={() => vote('DOWN')}
              disabled={voting}
              title="Thumbs down"
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-sm transition-all disabled:opacity-40 ${
                movie.userWatchedVote === 'DOWN'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 bg-transparent'
              }`}
            >
              👎
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
