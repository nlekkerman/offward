import { useCallback, useEffect, useRef, useState } from 'react'

export function isMobileDevice() {
  return navigator.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (window.matchMedia('(pointer: coarse)').matches &&
      Math.min(window.screen.width, window.screen.height) <= 768)
}

function unlockOrientation() {
  try {
    window.screen.orientation?.unlock?.()
  } catch (error) {
    console.warn('Unable to unlock screen orientation.', error)
  }
}

function useNavigationFullscreen(navigationActive) {
  const containerRef = useRef(null)
  const activeRef = useRef(false)
  const nativeRef = useRef(false)
  const generationRef = useRef(0)
  const mountedRef = useRef(false)
  const [fullscreen, setFullscreen] = useState(false)

  const exitFullscreen = useCallback(() => {
    const container = containerRef.current
    generationRef.current += 1
    activeRef.current = false
    nativeRef.current = false
    unlockOrientation()
    if (mountedRef.current) setFullscreen(false)

    if (container && document.fullscreenElement === container) {
      document.exitFullscreen().catch((error) => {
        console.warn('Unable to exit fullscreen navigation.', error)
        if (mountedRef.current && document.fullscreenElement === container) {
          activeRef.current = true
          nativeRef.current = true
          setFullscreen(true)
        }
      })
    }
  }, [])

  const enterFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container || activeRef.current || !isMobileDevice()) return

    const generation = ++generationRef.current
    activeRef.current = true
    setFullscreen(true)
    if (!container.requestFullscreen || document.fullscreenElement) return

    let request
    try {
      request = container.requestFullscreen()
    } catch (error) {
      console.warn('Native fullscreen is unavailable; using the viewport layout.', error)
      return
    }

    Promise.resolve(request).then(async () => {
      if (generation !== generationRef.current || !activeRef.current) {
        if (!activeRef.current && document.fullscreenElement === container) {
          try {
            await document.exitFullscreen()
          } catch (error) {
            console.warn('Unable to exit a pending fullscreen request.', error)
          }
        }
        return
      }
      if (document.fullscreenElement !== container) return
      nativeRef.current = true
      if (!window.screen.orientation?.lock) return
      try {
        await window.screen.orientation.lock('landscape')
        if (!activeRef.current) unlockOrientation()
      } catch (error) {
        console.warn('Landscape orientation is unavailable.', error)
      }
    }).catch((error) => {
      if (generation === generationRef.current && activeRef.current) {
        console.warn('Native fullscreen was rejected; using the viewport layout.', error)
      }
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const handleFullscreenChange = () => {
      if (containerRef.current && document.fullscreenElement === containerRef.current && activeRef.current) {
        nativeRef.current = true
      } else if (nativeRef.current) {
        generationRef.current += 1
        nativeRef.current = false
        activeRef.current = false
        unlockOrientation()
        setFullscreen(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      mountedRef.current = false
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      exitFullscreen()
    }
  }, [exitFullscreen])

  useEffect(() => {
    if (!navigationActive && activeRef.current) exitFullscreen()
  }, [navigationActive, exitFullscreen])

  useEffect(() => {
    if (!fullscreen) return undefined
    document.documentElement.classList.add('offward-navigation-fullscreen')
    return () => document.documentElement.classList.remove('offward-navigation-fullscreen')
  }, [fullscreen])

  return { containerRef, fullscreen, enterFullscreen, exitFullscreen }
}

export default useNavigationFullscreen
