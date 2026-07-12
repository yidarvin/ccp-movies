import toast from 'react-hot-toast'

export function showUndoToast({ message, onUndo, id, duration = 6000 }) {
  toast.custom(
    (t) => (
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-[10px] px-4 py-3 text-sm text-zinc-100 shadow-lg">
        <span className="line-clamp-1">{message}</span>
        <button
          onClick={() => {
            toast.dismiss(t.id) // dismiss FIRST — second click impossible
            onUndo()
          }}
          className="shrink-0 text-xs font-bold text-amber-400 hover:text-amber-300 border border-zinc-700 hover:border-amber-400 rounded-lg px-2.5 py-1 transition-colors"
        >
          Undo
        </button>
      </div>
    ),
    { duration, id }
  )
}
