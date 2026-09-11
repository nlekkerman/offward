import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getOffwardAccess } from '../../services/authApi.js'

function ManagementGuard() {
  const location = useLocation()
  const [access, setAccess] = useState(null)

  useEffect(() => {
    let isMounted = true

    getOffwardAccess().then((result) => {
      if (isMounted) {
        setAccess(result)
      }
    })

    return () => {
      isMounted = false
    }
  }, [location.pathname])

  if (access === null) {
    return <div className="management-loading">Loading management session...</div>
  }

  // A shared Kata Wild Django session never grants Offward access on its own.
  if (access.canManageOffward !== true) {
    return <Navigate to="/manage/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ManagementGuard
