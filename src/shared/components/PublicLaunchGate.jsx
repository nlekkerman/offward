import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getOffwardAccess } from '../../services/authApi.js'
import { PUBLIC_LAUNCH_ENABLED } from '../constants/launchGate.js'
import ComingSoonPage from './ComingSoonPage.jsx'
import LaunchGateLoading from './LaunchGateLoading.jsx'

// Temporary pre-launch gate: unauthenticated visitors see Coming Soon instead of the public app.
// Management keeps its own ManagementGuard/session checks and is never routed through here.
function PublicLaunchGate() {
  const location = useLocation()
  const bypass = location.pathname.startsWith('/manage')
  const [access, setAccess] = useState(null)

  useEffect(() => {
    if (bypass || PUBLIC_LAUNCH_ENABLED) return undefined

    let isMounted = true
    getOffwardAccess().then((result) => {
      if (isMounted) setAccess(result)
    })

    return () => {
      isMounted = false
    }
  }, [bypass])

  if (bypass || PUBLIC_LAUNCH_ENABLED) {
    return <Outlet />
  }

  if (access === null) {
    return <LaunchGateLoading />
  }

  if (access.canManageOffward !== true) {
    return <ComingSoonPage />
  }

  return <Outlet />
}

export default PublicLaunchGate
