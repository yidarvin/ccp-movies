import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import api from '../api'
import toast from 'react-hot-toast'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

// Weighted random pick — every movie gets at least 1 "ticket"; each net vote above the
// worst score in the set adds one more.
function pickWeighted(movies) {
  const min = Math.min(...movies.map((m) => m.netVotes))
  const weights = movies.map((m) => m.netVotes - min + 1)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < movies.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return movies.length - 1
}

// Delays between poster swaps while "spinning", easing out from fast to slow over ~2s.
function buildSpinDelays() {
  const STEPS = 12
  return Array.from({ length: STEPS }, (_, i) => {
    const t = i / (STEPS - 1)
    return Math.round(60 + t * (300 - 60))
  })
}

// Schedules the spin's poster-cycling + reveal as setTimeouts; all state updates happen
// inside those (deferred) callbacks, not synchronously — returns the timeout ids to clear.
function scheduleSpin(movieList, setDisplayIndex, setWinnerIndex, setPhase) {
  const winner = pickWeighted(movieList)
  const timeouts = []
  let elapsed = 0
  const delays = buildSpinDelays()
  delays.forEach((delay, i) => {
    elapsed += delay
    const isLast = i === delays.length - 1
    timeouts.push(
      setTimeout(() => {
        setDisplayIndex(isLast ? winner : Math.floor(Math.random() * movieList.length))
      }, elapsed)
    )
  })
  timeouts.push(
    setTimeout(() => {
      setWinnerIndex(winner)
      setPhase('revealed')
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#f4f4f5'],
      })
    }, elapsed + 200)
  )
  return timeouts
}

export default function RouletteModal({ movies, onClose, onWatched }) {
  const [movieList] = useState(() => movies)
  const [spinRound, setSpinRound] = useState(0)
  const [phase, setPhase] = useState('spinning') // 'spinning' | 'revealed'
  const [displayIndex, setDisplayIndex] = useState(0)
  const [winnerIndex, setWinnerIndex] = useState(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    const timeouts = scheduleSpin(movieList, setDisplayIndex, setWinnerIndex, setPhase)
    return () => timeouts.forEach(clearTimeout)
  }, [movieList, spinRound])

  function handleSpinAgain() {
    setPhase('spinning')
    setDisplayIndex(0)
    setWinnerIndex(null)
    setSpinRound((r) => r + 1)
  }

  const current = movieList[displayIndex]
  const winner = winnerIndex !== null ? movieList[winnerIndex] : null

  const score = winner?.netVotes ?? 0
  const scoreCls =
    score > 0 ? 'bg-amber-400 text-zinc-950' :
    score < 0 ? 'bg-red-500 text-white'       :
                'bg-zinc-700 text-zinc-300'

  async function handleMarkWatched() {
    if (marking || !winner) return
    setMarking(true)
    try {
      const res = await api.patch(`/movies/${winner.id}/watch`)
      onWatched(res.data.movie)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark as watched')
      setMarking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs text-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {phase === 'spinning' ? (
          <>
            <p className="text-zinc-400 font-semibold text-sm mb-4">Spinning…</p>
            <div className="w-48 aspect-[2/3] mx-auto rounded-xl overflow-hidden bg-zinc-800 ring-2 ring-amber-400">
              {current?.posterPath ? (
                <img
                  src={`${TMDB_IMG}${current.posterPath}`}
                  alt={current.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">🎬</div>
              )}
            </div>
            <p className="text-white font-medium text-sm mt-3 line-clamp-1">{current?.title}</p>
          </>
        ) : (
          <>
            <p className="text-amber-400 font-bold text-lg mb-4">Watch this!</p>
            <div className="w-48 aspect-[2/3] mx-auto rounded-xl overflow-hidden bg-zinc-800 ring-2 ring-emerald-500 relative">
              {winner?.posterPath ? (
                <img
                  src={`${TMDB_IMG}${winner.posterPath}`}
                  alt={winner.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">🎬</div>
              )}
              <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-md tabular-nums ${scoreCls}`}>
                {score > 0 ? `+${score}` : score}
              </div>
            </div>
            <p className="text-white font-semibold text-sm mt-3 line-clamp-2">{winner?.title}</p>
            {winner?.year && <p className="text-zinc-500 text-xs mt-0.5">{winner.year}</p>}
            {winner?.streamingPlatforms?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {winner.streamingPlatforms.map((p) => (
                  <span key={p} className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                    {p}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={handleSpinAgain}
                className="border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 rounded-xl px-4 py-2 text-sm transition-colors"
              >
                Spin again
              </button>
              <button
                onClick={handleMarkWatched}
                disabled={marking}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl px-4 py-2 text-sm transition-colors"
              >
                {marking ? '…' : 'Mark as watched'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
