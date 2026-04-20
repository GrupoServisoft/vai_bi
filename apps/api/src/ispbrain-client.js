import { requireIspbrainCreds, config } from './config.js'

let cachedToken = null
let cachedTokenAt = 0
const ISPBRAIN_TIMEOUT_MS = 20000
const ISPBRAIN_RETRIES = 2

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, options = {}, label = 'ISPbrain request') {
  let lastError = null

  for (let attempt = 0; attempt <= ISPBRAIN_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(ISPBRAIN_TIMEOUT_MS),
      })
      return response
    } catch (error) {
      lastError = error
      if (attempt === ISPBRAIN_RETRIES) break
      await wait(700 * (attempt + 1))
    }
  }

  throw new Error(`${label}: ${lastError?.message || 'fetch failed'}`)
}

export async function getToken() {
  requireIspbrainCreds()

  if (cachedToken && Date.now() - cachedTokenAt < 50 * 60 * 1000) {
    return cachedToken
  }

  const response = await fetchWithRetry(`${config.ispbrain.baseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.ispbrain.username,
      password: config.ispbrain.password,
    }),
  }, 'Error autenticando ISPbrain')

  if (!response.ok) {
    throw new Error(`Error autenticando ISPbrain: ${response.status}`)
  }

  const json = await response.json()
  cachedToken = json.token_access
  cachedTokenAt = Date.now()
  return cachedToken
}

export async function ispbrainGet(path, params = {}) {
  const token = await getToken()
  const url = new URL(`${config.ispbrain.baseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetchWithRetry(url, {
    headers: { Authorization: token },
  }, `Error ISPbrain GET ${path}`)

  if (!response.ok) {
    throw new Error(`Error ISPbrain GET ${path}: ${response.status}`)
  }

  return response.json()
}
