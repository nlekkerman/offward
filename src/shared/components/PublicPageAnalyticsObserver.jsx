import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { observePublicLocation } from '../../services/analytics.js'

function PublicPageAnalyticsObserver() {
  const { pathname, key } = useLocation()

  useEffect(() => {
    observePublicLocation(pathname, key)
  }, [key, pathname])

  return null
}

export default PublicPageAnalyticsObserver
