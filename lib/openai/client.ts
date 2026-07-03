import 'server-only'
import OpenAI from 'openai'

let client: OpenAI | null = null

/**
 * Lazily-initialised OpenAI client. A module-level `new OpenAI()` would throw
 * at IMPORT time when OPENAI_API_KEY is missing — killing every route that
 * transitively imports this file (deploy looks green, then all AI routes 500
 * on first load, including the cron digest). With the proxy, a missing key
 * only fails the actual API call, inside the route's own try/catch.
 */
const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    if (!client) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set')
      client = new OpenAI({ apiKey })
    }
    return Reflect.get(client, prop, client)
  },
})

export default openai
