'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TestTimerProps {
  totalSeconds: number
  onExpire?: () => void
  className?: string
}

export function TestTimer({ totalSeconds, onExpire, className = '' }: TestTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds)

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.()
      return
    }
    const id = setInterval(() => setRemaining(s => s - 1), 1000)
    return () => clearInterval(id)
  }, [remaining, onExpire])

  const hours   = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  const pct = remaining / totalSeconds
  const urgent = pct < 0.15

  const format = (n: number) => String(n).padStart(2, '0')

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold tabular-nums transition-colors ${
      urgent
        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    } ${className}`}>
      <Clock size={13} strokeWidth={2} className="shrink-0" />
      {hours > 0 ? `${format(hours)}:` : ''}{format(minutes)}:{format(seconds)}
    </div>
  )
}
