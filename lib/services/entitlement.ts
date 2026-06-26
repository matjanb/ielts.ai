// Client-side read of the user's billing state. Best-effort: on any failure we
// assume a free, unused account so the UI defaults to the safe "free" view.
export interface Entitlement {
  subscribed: boolean
  freeMockUsed: boolean
}

export async function getEntitlement(): Promise<Entitlement> {
  try {
    const res = await fetch('/api/entitlement')
    if (!res.ok) return { subscribed: false, freeMockUsed: false }
    return (await res.json()) as Entitlement
  } catch {
    return { subscribed: false, freeMockUsed: false }
  }
}
