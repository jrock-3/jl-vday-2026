export const DAY_MS = 24 * 60 * 60 * 1000

export interface TimerState {
  index: number
  unlockAt: number
}

type StateMap = Record<string, TimerState>

const CACHE_KEY = "timerCache"

const buildStates: StateMap = (() => {
  try { return JSON.parse(import.meta.env.VITE_TIMER_STATES || "{}") }
  catch { return {} }
})()

const getCache = (): StateMap => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") }
  catch { return {} }
}

export const saveState = (email: string, state: TimerState) => {
  try {
    const cache = getCache()
    cache[email] = state
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

export const getState = (email: string): TimerState => {
  const cache = getCache()
  const build = buildStates[email]
  
  if (cache[email] && (!build || cache[email].index >= build.index)) {
    return cache[email]
  }
  
  if (build) return build
  
  const defaultState = { index: 0, unlockAt: Date.now() + DAY_MS }
  saveState(email, defaultState)
  return defaultState
}

export const formatTime = (now: number, unlockAt: number) => {
  const secs = Math.max(0, Math.floor((unlockAt - now) / 1000))
  const h = String(Math.floor(secs / 3600)).padStart(2, "0")
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0")
  const s = String(secs % 60).padStart(2, "0")
  return `${h}:${m}:${s}`
}

export const syncToGitHub = async (email: string, index: number, unlockAt: number) => {
  const { VITE_GITHUB_OWNER: owner, VITE_GITHUB_REPO: repo, VITE_GITHUB_PAT: token } = import.meta.env
  if (!owner || !repo || !token) return false

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/update-timer.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: { email, reason_index: String(index), unlock_time: String(unlockAt) },
        }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

export const reasons: string[] = (import.meta.env.VITE_REASONS || "").split("\n").filter(Boolean)
