import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getSession, loginWithSession } from '../../services/authApi.js'

function ManageLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/manage'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionState, setSessionState] = useState('checking')

  useEffect(() => {
    let active = true

    async function validateSession() {
      const result = await getSession()
      if (!active) return

      if (result.isAuthenticated === true && result.isStaff === true) {
        setSessionState('authenticated')
        return
      }

      if (result.isAuthenticated === true) {
        setSessionState('denied')
        return
      }

      setSessionState('unauthenticated')
    }

    validateSession()

    return () => {
      active = false
    }
  }, [])

  if (sessionState === 'authenticated') {
    return <Navigate to={from} replace />
  }

  if (sessionState === 'denied') {
    return <Navigate to="/manage/access-denied" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await loginWithSession({ username, password })
      if (result.isAuthenticated === true && result.isStaff === true) {
        navigate(from, { replace: true })
        return
      }

      if (result.isAuthenticated === true) {
        navigate('/manage/access-denied', { replace: true })
        return
      }

      setError('Unable to sign in with the supplied account.')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="management-login-shell">
      <div className="management-login-card">
        <p className="eyebrow">Management</p>
        <h1>Offward Management</h1>
        {sessionState === 'checking' && <div className="management-login-status">Checking existing session...</div>}
        <form onSubmit={handleSubmit} className="management-login-form">
          <label>
            Username
            <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          {error && <div className="management-error">{error}</div>}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ManageLoginPage
