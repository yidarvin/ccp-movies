import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import { showUndoToast } from '../lib/undoToast'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w92'

function Badge({ children, variant = 'default' }) {
  const cls = {
    default: 'bg-zinc-800 text-zinc-400',
    gold:    'bg-amber-400/10 text-amber-400 border border-amber-400/20',
    red:     'bg-red-500/10 text-red-400 border border-red-500/20',
  }[variant]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}

// ── Movies table ──────────────────────────────────────────────────
function MoviesTable({ movies, onDelete, onRestore }) {
  const [deleting, setDeleting] = useState(null)

  async function handleDelete(movie) {
    setDeleting(movie.id)
    try {
      await api.delete(`/movies/${movie.id}`)
      onDelete(movie.id)
      showUndoToast({
        message: `"${movie.title}" deleted`,
        onUndo: async () => {
          try {
            const res = await api.patch(`/movies/${movie.id}/restore`)
            onRestore(res.data.movie)
          } catch (err) {
            toast.error(err.response?.data?.error || 'Restore failed')
          }
        },
        id: `deleted-${movie.id}`,
      })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Movie</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Genres</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Platforms</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Added by</th>
            <th className="text-center px-4 py-3 text-zinc-400 font-medium">Votes</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {movies.map((movie) => (
            <tr key={movie.id} className="hover:bg-zinc-900/40 transition-colors group">
              {/* Movie */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                    {movie.posterPath ? (
                      <img
                        src={`${TMDB_IMG}${movie.posterPath}`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">🎬</div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium line-clamp-1">{movie.title}</p>
                    {movie.year && <p className="text-zinc-500 text-xs">{movie.year}</p>}
                  </div>
                </div>
              </td>
              {/* Genres */}
              <td className="px-4 py-3 hidden sm:table-cell">
                <div className="flex flex-wrap gap-1">
                  {movie.genres.slice(0, 2).map((g) => (
                    <Badge key={g}>{g}</Badge>
                  ))}
                </div>
              </td>
              {/* Platforms */}
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {movie.streamingPlatforms.slice(0, 2).map((p) => (
                    <Badge key={p} variant="gold">{p}</Badge>
                  ))}
                  {movie.streamingPlatforms.length === 0 && (
                    <span className="text-zinc-700 text-xs">—</span>
                  )}
                </div>
              </td>
              {/* Added by */}
              <td className="px-4 py-3 text-zinc-400">{movie.addedBy?.username}</td>
              {/* Votes */}
              <td className="px-4 py-3 text-center">
                <span className={`font-bold tabular-nums ${
                  movie.netVotes > 0 ? 'text-amber-400' :
                  movie.netVotes < 0 ? 'text-red-400' :
                  'text-zinc-500'
                }`}>
                  {movie.netVotes > 0 ? `+${movie.netVotes}` : movie.netVotes}
                </span>
              </td>
              {/* Date */}
              <td className="px-4 py-3 text-zinc-500 hidden lg:table-cell text-xs">
                {new Date(movie.addedAt).toLocaleDateString()}
              </td>
              {/* Delete */}
              <td className="px-4 py-3">
                <button
                  onClick={() => handleDelete(movie)}
                  disabled={deleting === movie.id}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Users table ───────────────────────────────────────────────────
function UsersTable({ users }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Username</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Role</th>
            <th className="text-center px-4 py-3 text-zinc-400 font-medium">Movies</th>
            <th className="text-center px-4 py-3 text-zinc-400 font-medium">Votes</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
              <td className="px-4 py-3">
                <span className="text-white font-medium">{u.username}</span>
              </td>
              <td className="px-4 py-3">
                {u.isAdmin
                  ? <Badge variant="gold">admin</Badge>
                  : <Badge>member</Badge>
                }
              </td>
              <td className="px-4 py-3 text-center text-zinc-300 tabular-nums">
                {u._count.movies}
              </td>
              <td className="px-4 py-3 text-center text-zinc-300 tabular-nums">
                {u._count.votes}
              </td>
              <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Deleted movies table ────────────────────────────────────────────
function DeletedTable({ movies, onRestore }) {
  const [restoring, setRestoring] = useState(null)

  async function handleRestore(movie) {
    setRestoring(movie.id)
    try {
      const res = await api.patch(`/movies/${movie.id}/restore`)
      onRestore(res.data.movie)
      toast.success(`"${movie.title}" restored`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Movie</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Deleted</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {movies.map((movie) => (
            <tr key={movie.id} className="hover:bg-zinc-900/40 transition-colors group">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                    {movie.posterPath ? (
                      <img
                        src={`${TMDB_IMG}${movie.posterPath}`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">🎬</div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium line-clamp-1">{movie.title}</p>
                    {movie.year && <p className="text-zinc-500 text-xs">{movie.year}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell text-xs">
                {new Date(movie.deletedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleRestore(movie)}
                  disabled={restoring === movie.id}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-emerald-400 transition-all p-1.5 rounded-lg hover:bg-emerald-500/10 disabled:opacity-40"
                  title="Restore"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [movies, setMovies] = useState([])
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('movies')

  const [deletedMovies, setDeletedMovies]   = useState([])
  const [deletedLoading, setDeletedLoading] = useState(false)
  const [deletedLoaded, setDeletedLoaded]   = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/movies'),
      api.get('/admin/users'),
    ])
      .then(([moviesRes, usersRes]) => {
        setMovies(moviesRes.data.movies)
        setUsers(usersRes.data.users)
      })
      .catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false))
  }, [])

  function loadDeleted() {
    setDeletedLoading(true)
    api.get('/movies/deleted')
      .then((r) => {
        setDeletedMovies(r.data.movies)
        setDeletedLoaded(true)
      })
      .catch(() => toast.error('Failed to load deleted movies'))
      .finally(() => setDeletedLoading(false))
  }

  function handleSwitchTab(newTab) {
    setTab(newTab)
    if (newTab === 'deleted' && !deletedLoaded) loadDeleted()
  }

  function handleDeleteMovie(id) {
    setMovies((prev) => prev.filter((m) => m.id !== id))
    // The deleted movie now belongs in the Deleted tab once it's been loaded.
    setDeletedLoaded(false)
  }

  function handleRestoreMovie(movie) {
    setDeletedMovies((prev) => prev.filter((m) => m.id !== movie.id))
    setMovies((prev) => (prev.some((m) => m.id === movie.id) ? prev : [movie, ...prev]))
  }

  const moviesSorted = [...movies].sort((a, b) => b.netVotes - a.netVotes)
  const deletedSorted = [...deletedMovies].sort(
    (a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {movies.length} movies · {users.length} users
            </p>
          </div>
          <Link
            to="/"
            className="text-sm text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ← Back to list
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit mb-6">
          {[
            { key: 'movies',  label: `Movies (${movies.length})` },
            { key: 'users',   label: `Users (${users.length})` },
            { key: 'deleted', label: `Deleted (${deletedMovies.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSwitchTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-amber-400 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'movies' ? (
          moviesSorted.length === 0 ? (
            <p className="text-zinc-500 text-center py-12">No movies yet.</p>
          ) : (
            <MoviesTable movies={moviesSorted} onDelete={handleDeleteMovie} onRestore={handleRestoreMovie} />
          )
        ) : tab === 'users' ? (
          users.length === 0 ? (
            <p className="text-zinc-500 text-center py-12">No users yet.</p>
          ) : (
            <UsersTable users={users} />
          )
        ) : deletedLoading ? (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deletedSorted.length === 0 ? (
          <p className="text-zinc-500 text-center py-12">No deleted movies.</p>
        ) : (
          <DeletedTable movies={deletedSorted} onRestore={handleRestoreMovie} />
        )}
      </main>
    </div>
  )
}
