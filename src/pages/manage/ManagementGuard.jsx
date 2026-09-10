import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getSession } from '../../services/authApi.js'

function ManagementGuard() {
  const location = useLocation()
  const [session, setSession] = useState(null)

  useEffect(() => {
    let isMounted = true

    getSession().then((result) => {
      if (isMounted) {
        setSession(result)
      }
    })

    return () => {
      isMounted = false
    }
  }, [location.pathname])

  if (session === null) {
    return <div className="management-loading">Loading management session...</div>
  }

  if (session.isAuthenticated !== true) {
    return <Navigate to="/manage/login" replace state={{ from: location }} />
  }

  if (session.isStaff !== true) {
    return <Navigate to="/manage/access-denied" replace />
  }

  return <Outlet />
}

export default ManagementGuard
