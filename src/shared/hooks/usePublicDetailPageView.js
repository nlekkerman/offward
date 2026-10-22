import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { observePublicLocation, trackPublicDetailPageView } from '../../services/analytics.js'

function usePublicDetailPageView(status, contentType, content) {
  const { pathname, key } = useLocation()
  const uuid = content?.id

  useEffect(() => {
    observePublicLocation(pathname, key)
    if (status !== 'success') return
    trackPublicDetailPageView(pathname, key, contentType, uuid)
  }, [contentType, key, pathname, status, uuid])
}

export default usePublicDetailPageView
