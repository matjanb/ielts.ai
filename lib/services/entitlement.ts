// Client-side read of the user's billing state. Best-effort: on any failure we
// assume a free, unused account so the UI defaults to the safe "free" view.
export interface Entitlement {
  subscribed: boolean
  freeMockUsed: boolean
  locked: string[]
  onboardingCompleted: boolean
}

// On failure assume free + already-onboarded, so a transient error never traps
// the user in the onboarding redirect.
const FREE_DEFAULT: Entitlement = { subscribed: false, freeMockUsed: false, locked: [], onboardingCompleted: true }

export async function getEntitlement(): Promise<Entitlement> {
  try {
    const res = await fetch('/api/entitlement')
    if (!res.ok) return FREE_DEFAULT
    return (await res.json()) as Entitlement
  } catch {
    return FREE_DEFAULT
  }
}
