const AUTH_STATES = new Set(['pending', 'anonymous', 'authenticated', 'superuser', 'failed'])

let authState = 'pending'
const listeners = new Set()

export function getOffwardAuthState() {
  return authState
}

export function setOffwardAuthState(nextState) {
  if (!AUTH_STATES.has(nextState) || authState === nextState) return
  authState = nextState
  listeners.forEach((listener) => listener(authState))
}

export function subscribeToOffwardAuthState(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
