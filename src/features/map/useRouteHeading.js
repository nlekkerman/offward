import { useCallback, useEffect, useRef, useState } from 'react'

const GPS_MAX_AGE_MS = 10000
const COMPASS_MAX_AGE_MS = 2000
const GPS_MAX_ACCURACY_METERS = 25
const MOVING_SPEED = 0.8
const STOPPED_SPEED = 0.5
const SMOOTHING_TIME_MS = 400

function normalizeHeading(value) {
  return ((value % 360) + 360) % 360
}

function angleDifference(target, current) {
  return ((target - current + 540) % 360) - 180
}

function getCompassHeading(event) {
  const { alpha, beta, gamma } = event
  if (
    !Number.isFinite(beta) || Math.abs(beta) > 60 ||
    !Number.isFinite(gamma) || Math.abs(gamma) > 60
  ) return null

  const screenAngle = window.screen?.orientation?.angle
  const orientation = Number.isFinite(screenAngle)
    ? screenAngle
    : Number.isFinite(window.orientation) ? window.orientation : 0
  const radians = Math.PI / 180
  const screenX = Math.sin(orientation * radians)
  const screenY = Math.cos(orientation * radians)
  const east = screenX * Math.cos(gamma * radians)
  const north = screenX * Math.sin(beta * radians) * Math.sin(gamma * radians) +
    screenY * Math.cos(beta * radians)
  if (Math.hypot(east, north) < 0.5) return null

  const screenOffset = Math.atan2(east, north) / radians
  if (Number.isFinite(event.webkitCompassHeading)) {
    if (
      event.webkitCompassHeading < 0 || event.webkitCompassHeading >= 360 ||
      !Number.isFinite(event.webkitCompassAccuracy) ||
      event.webkitCompassAccuracy < 0 || event.webkitCompassAccuracy > 30
    ) return null
    return normalizeHeading(event.webkitCompassHeading + screenOffset)
  }

  if (event.absolute !== true || !Number.isFinite(alpha) || alpha < 0 || alpha >= 360) {
    return null
  }
  return normalizeHeading(screenOffset - alpha)
}

export default function useRouteHeading(enabled, position) {
  const [heading, setHeading] = useState(null)
  const [permission, setPermission] = useState(() => (
    typeof window !== 'undefined' &&
    typeof window.DeviceOrientationEvent?.requestPermission === 'function'
      ? 'prompt'
      : 'not-required'
  ))
  const positionRef = useRef(position)
  const compassRef = useRef(null)
  const previousCompassRef = useRef(null)
  const movingRef = useRef(false)
  const smoothedRef = useRef(null)
  const updateRef = useRef(null)

  const requestCompass = useCallback(async () => {
    try {
      const result = await window.DeviceOrientationEvent.requestPermission()
      setPermission(result === 'granted' ? 'granted' : 'denied')
    } catch (error) {
      console.warn('Unable to request compass permission.', error)
      setPermission('error')
    }
  }, [])

  useEffect(() => {
    positionRef.current = position
    updateRef.current?.()
  }, [position])

  useEffect(() => {
    if (!enabled) return undefined

    const update = () => {
      const now = Date.now()
      const current = positionRef.current
      const age = now - current?.timestamp
      const validGps = Number.isFinite(current?.timestamp) && age >= 0 && age <= GPS_MAX_AGE_MS &&
        Number.isFinite(current?.accuracy) && current.accuracy >= 0 &&
        current.accuracy <= GPS_MAX_ACCURACY_METERS &&
        Number.isFinite(current?.speed) && current.speed >= 0 &&
        Number.isFinite(current?.heading) && current.heading >= 0 && current.heading < 360
      movingRef.current = validGps && current.speed >= (movingRef.current ? STOPPED_SPEED : MOVING_SPEED)
      const compass = compassRef.current
      const validCompass = compass && now - compass.timestamp >= 0 &&
        now - compass.timestamp <= COMPASS_MAX_AGE_MS
      const target = movingRef.current ? current.heading : validCompass ? compass.heading : null

      if (target === null) {
        smoothedRef.current = null
        setHeading(null)
        return
      }

      const previous = smoothedRef.current
      const elapsed = previous ? Math.max(0, now - previous.timestamp) : 0
      const value = previous
        ? normalizeHeading(previous.value + angleDifference(target, previous.value) *
          (1 - Math.exp(-elapsed / SMOOTHING_TIME_MS)))
        : target
      smoothedRef.current = { value, timestamp: now }
      setHeading(value)
    }
    updateRef.current = update

    let lastCompassUpdate = 0
    const handleOrientation = (event) => {
      if (event.absolute !== true && !Number.isFinite(event.webkitCompassHeading)) return
      const value = getCompassHeading(event)
      const now = Date.now()
      const previous = previousCompassRef.current
      if (value === null) {
        previousCompassRef.current = null
        compassRef.current = null
      } else {
        previousCompassRef.current = { heading: value, timestamp: now }
        compassRef.current = previous && now - previous.timestamp <= COMPASS_MAX_AGE_MS &&
          Math.abs(angleDifference(value, previous.heading)) <= 45
          ? { heading: value, timestamp: now }
          : null
      }
      if (value === null || !compassRef.current || now - lastCompassUpdate >= 50) {
        lastCompassUpdate = now
        update()
      }
    }

    const canListen = permission === 'not-required' || permission === 'granted'
    if (canListen && typeof window.DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientationabsolute', handleOrientation)
      window.addEventListener('deviceorientation', handleOrientation)
    }
    update()
    const timer = window.setInterval(update, 500)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('deviceorientationabsolute', handleOrientation)
      window.removeEventListener('deviceorientation', handleOrientation)
      updateRef.current = null
      compassRef.current = null
      previousCompassRef.current = null
      movingRef.current = false
      smoothedRef.current = null
      setHeading(null)
    }
  }, [enabled, permission])

  return {
    heading: enabled ? heading : null,
    permission,
    requestCompass,
  }
}
