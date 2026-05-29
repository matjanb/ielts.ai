'use client'

interface QuestionNavProps {
  total: number
  current: number
  answers: Record<number, string | string[]>
  onSelect: (index: number) => void
}

export function QuestionNav({ total, current, answers, onSelect }: QuestionNavProps) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-3 px-1">
        Questions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const answered = Boolean(
            answers[i] && (typeof answers[i] === 'string'
              ? answers[i]
              : (answers[i] as string[]).length > 0)
          )
          const isCurrent = current === i
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : answered
                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-[var(--bg-soft)] text-[var(--text-2)] hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-1.5">
        {[
          { color: 'bg-indigo-600',                                             label: 'Current' },
          { color: 'bg-emerald-100 dark:bg-emerald-500/15',                     label: 'Answered' },
          { color: 'bg-[var(--bg-soft)]',                              label: 'Not answered' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-[10px] text-[var(--text-3)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
