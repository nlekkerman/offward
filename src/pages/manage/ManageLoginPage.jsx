import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getOffwardAccess, loginWithSession } from '../../services/authApi.js'

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

    async function validateAccess() {
      const result = await getOffwardAccess()
      if (!active) return

      if (result.canManageOffward === true) {
        setSessionState('authorized')
        return
      }

      // A shared Kata Wild session may be authenticated but still lacks Offward access.
      setSessionState('unauthorized')
    }

    validateAccess()

    return () => {
      active = false
    }
  }, [])

  if (sessionState === 'authorized') {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await loginWithSession({ username, password })
      if (result.canManageOffward === true) {
        navigate(from, { replace: true })
        return
      }

      setError('This account does not have Offward management access.')
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
        {sessionState === 'checking' && <div className="management-login-status">Checking Offward access...</div>}
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
