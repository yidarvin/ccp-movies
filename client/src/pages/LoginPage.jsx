import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left: film-strip decoration */}
      <div className="hidden lg:flex flex-col w-96 bg-zinc-900 border-r border-zinc-800 film-strip items-center justify-center gap-6 p-8">
        <div className="text-6xl">🎬</div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Chonky Cat Movies</h2>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
            Vote on what to watch.<br />Your friends' picks, ranked live.
          </p>
        </div>
        {/* Decorative film frames */}
        <div className="flex flex-col gap-2 w-full mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/60 rounded border border-zinc-700/50 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-zinc-700/80 flex items-center justify-center text-lg">
                {['🍿', '🎥', '⭐'][i]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="text-4xl mb-2">🐱</div>
            <h1 className="text-2xl font-bold text-white">Chonky Cat Movies</h1>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-zinc-400 text-sm mb-6">Sign in to see the watchlist</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-colors"
                placeholder="your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl px-4 py-2.5 transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-5">
            No account?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium">
              Register with invite code
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
