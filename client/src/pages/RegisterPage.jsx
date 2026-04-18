import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', inviteCode: '' })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/register', form)
      login(res.data.token, res.data.user)
      toast.success('Welcome to Chonky Cat Movies!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-96 bg-zinc-900 border-r border-zinc-800 film-strip items-center justify-center gap-6 p-8">
        <div className="text-6xl">🎟️</div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Join the crew</h2>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
            Get your invite code from a friend<br />and claim your seat.
          </p>
        </div>
        <div className="w-full mt-4 p-4 bg-amber-400/10 border border-amber-400/20 rounded-xl">
          <p className="text-amber-400 text-xs font-medium text-center">
            Default invite code: CHONKYCATMOVIES
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="text-4xl mb-2">🐱</div>
            <h1 className="text-2xl font-bold text-white">Join Chonky Cat Movies</h1>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Create your account</h2>
          <p className="text-zinc-400 text-sm mb-6">You'll need an invite code</p>

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
                placeholder="choose a username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-colors"
                placeholder="at least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Invite Code</label>
              <input
                name="inviteCode"
                value={form.inviteCode}
                onChange={handleChange}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-colors font-mono tracking-widest uppercase"
                placeholder="CHONKYCATMOVIES"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl px-4 py-2.5 transition-colors mt-2"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
