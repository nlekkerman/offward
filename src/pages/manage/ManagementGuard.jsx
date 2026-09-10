import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getSession } from '../../services/authApi.js'

function ManagementGuard() {
  const location = useLocation()
  const [state, setState] = useState({ status: 'loading', user: null })

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      try {
        const result = await getSession()
        if (isMounted) {
          setState({ status: result.status, user: result.user })
        }
      } catch {
        if (isMounted) {
          setState({ status: 'unauthenticated', user: null })
        }
      }
    }

    loadSession()

    return () => {
      isMounted = false
    }
  }, [location.pathname])

  if (state.status === 'loading') {
    return <div className="management-loading">Loading management session…</div>
  }

  if (state.status === 'unauthenticated') {
    return <Navigate to="/manage/login" replace state={{ from: location }} />
  }

  if (state.status === 'denied') {
    return <Navigate to="/manage/access-denied" replace state={{ user: state.user }} />
  }

  return <Outlet />
}

export default ManagementGuard
