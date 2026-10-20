import { useCallback, useEffect, useRef, useState } from 'react'

const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
}

function getLocationErrorMessage(error) {
  switch (error?.code) {
    case 1:
      return 'Location permission was denied. Allow location access and retry.'
    case 2:
      return 'Your location is unavailable. Check your device signal and retry.'
    case 3:
      return 'The location request timed out. Try again.'
    default:
      return 'Unable to get your location. Try again.'
  }
}

function normalizePosition(position) {
  const latitude = position?.coords?.latitude
  const longitude = position?.coords?.longitude
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  const accuracy = position.coords.accuracy
  const speed = position.coords.speed
  return {
    latitude,
    longitude,
    accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
    speed: typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null,
    timestamp: Number.isFinite(position.timestamp) ? position.timestamp : null,
  }
}

export default function useUserLocation(onPosition) {
  const [position, setPosition] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [active, setActive] = useState(false)
  const watcherIdRef = useRef(null)
  const activeRef = useRef(false)
  const generationRef = useRef(0)
  const onPositionRef = useRef(onPosition)

  useEffect(() => {
    onPositionRef.current = onPosition
  }, [onPosition])

  const clearWatcher = useCallback(() => {
    if (watcherIdRef.current === null) return
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watcherIdRef.current)
    }
    watcherIdRef.current = null
  }, [])

  const stop = useCallback(() => {
    generationRef.current += 1
    activeRef.current = false
    clearWatcher()
    setPosition(null)
    setLoading(false)
    setError(null)
    setActive(false)
  }, [clearWatcher])

  const start = useCallback(() => {
    if (activeRef.current) return

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not supported by this browser.')
      setLoading(false)
      setActive(false)
      return
    }

    activeRef.current = true
    const generation = ++generationRef.current
    setPosition(null)
    setError(null)
    setLoading(true)
    setActive(true)

    const handlePosition = (browserPosition) => {
      if (!activeRef.current || generation !== generationRef.current) return
      const nextPosition = normalizePosition(browserPosition)
      if (!nextPosition) {
        handleError({ code: 2 })
        return
      }
      setPosition(nextPosition)
      setLoading(false)
      onPositionRef.current?.(nextPosition)
    }

    const handleError = (browserError) => {
      if (!activeRef.current || generation !== generationRef.current) return
      activeRef.current = false
      generationRef.current += 1
      clearWatcher()
      setPosition(null)
      setLoading(false)
      setActive(false)
      setError(getLocationErrorMessage(browserError))
    }

    try {
      const watcherId = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        LOCATION_OPTIONS,
      )
      if (activeRef.current && generation === generationRef.current) {
        watcherIdRef.current = watcherId
      } else {
        navigator.geolocation.clearWatch(watcherId)
      }
    } catch {
      activeRef.current = false
      generationRef.current += 1
      clearWatcher()
      setLoading(false)
      setActive(false)
      setError('Unable to start location tracking. Try again.')
    }
  }, [clearWatcher])

  useEffect(() => () => {
    generationRef.current += 1
    activeRef.current = false
    clearWatcher()
  }, [clearWatcher])

  return { position, loading, error, active, start, stop }
}
