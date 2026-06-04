/* eslint-disable @typescript-eslint/no-explicit-any */
/* Lazy Paddle.js loader for the overlay checkout.
 *
 * Injects the Paddle v2 script once, initialises it with the public client
 * token, and resolves the global `Paddle` object. Returns null when the token
 * is missing or the script fails to load, so callers can degrade gracefully. */

let paddlePromise: Promise<any> | null = null

export function getPaddle(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if ((window as any).Paddle) return Promise.resolve((window as any).Paddle)
  if (paddlePromise) return paddlePromise

  paddlePromise = new Promise(resolve => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) { resolve(null); return }

    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.onload = () => {
      const Paddle = (window as any).Paddle
      try {
        if (process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox') Paddle.Environment.set('sandbox')
        Paddle.Initialize({ token })
        resolve(Paddle)
      } catch {
        resolve(null)
      }
    }
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return paddlePromise
}

/** Plan id (from the UI) → public Paddle Price ID (overlay checkout is client-side). */
export const PADDLE_PRICE: Record<string, string | undefined> = {
  '1mo':  process.env.NEXT_PUBLIC_PADDLE_PRICE_1MO,
  '3mo':  process.env.NEXT_PUBLIC_PADDLE_PRICE_3MO,
  '12mo': process.env.NEXT_PUBLIC_PADDLE_PRICE_12MO,
}
