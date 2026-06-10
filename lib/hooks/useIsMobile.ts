'use client'

import { useEffect, useState } from 'react'

/**
 * True on phone-sized viewports. Shared across the app so pages can swap to
 * mobile layouts/spacing (the codebase uses inline styles, which CSS media
 * queries can't reach — this hook is how we make them responsive).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])
  return isMobile
}
