import assert from 'node:assert/strict'
import test from 'node:test'
import { createRouteArrivalDetector, getDistanceToRouteMeters } from './routeProximity.js'

const route = {
  type: 'LineString',
  coordinates: [[0, 0], [0.01, 0]],
}

function position(timestamp, overrides = {}) {
  return {
    latitude: 0,
    longitude: 0.005,
    accuracy: 5,
    speed: 0,
    timestamp,
    ...overrides,
  }
}

test('distance is measured to the nearest point along the route, including the ends', () => {
  assert.ok(getDistanceToRouteMeters(position(1000), route) < 1)
  assert.ok(getDistanceToRouteMeters(position(1000, { latitude: 0.0001 }), route) > 10)
  assert.ok(getDistanceToRouteMeters(position(1000, { longitude: 0.0001 }), route) < 1)
  const endpointDistance = getDistanceToRouteMeters(position(1000, { longitude: -0.0001 }), route)
  assert.ok(endpointDistance > 10 && endpointDistance < 12)
  assert.ok(getDistanceToRouteMeters(position(1000, { latitude: 0.00023 }), route) > 25)
  assert.equal(getDistanceToRouteMeters(position(1000), { type: 'LineString', coordinates: [[0, 0]] }), null)
})

test('walking arrival requires three unique fresh and reliable readings and is latched', () => {
  const detector = createRouteArrivalDetector()
  assert.equal(detector.process(position(1000), route, 'walking', 1000), false)
  assert.equal(detector.process(position(1000), route, 'walking', 1000), false)
  assert.equal(detector.process(position(2000), route, 'walking', 2000), false)
  assert.equal(detector.process(position(3000), route, 'walking', 3000), true)
  assert.equal(detector.process(position(4000), route, 'walking', 4000), false)
})

test('walking arrival can begin at either the starting point or halfway along the route', () => {
  const startDetector = createRouteArrivalDetector()
  const startPosition = (timestamp) => position(timestamp, { longitude: 0 })
  startDetector.process(startPosition(1000), route, 'walking', 1000)
  startDetector.process(startPosition(2000), route, 'walking', 2000)
  assert.equal(startDetector.process(startPosition(3000), route, 'walking', 3000), true)

  const halfwayDetector = createRouteArrivalDetector()
  halfwayDetector.process(position(1000), route, 'walking', 1000)
  halfwayDetector.process(position(2000), route, 'walking', 2000)
  assert.equal(halfwayDetector.process(position(3000), route, 'walking', 3000), true)
})

test('outside, stale, inaccurate and missing-accuracy readings reset the sequence', () => {
  const detector = createRouteArrivalDetector()
  detector.process(position(1000), route, 'walking', 1000)
  assert.equal(detector.process(position(2000, { accuracy: 21 }), route, 'walking', 2000), false)
  detector.process(position(3000), route, 'walking', 3000)
  assert.equal(detector.process(position(4000, { timestamp: 1000 }), route, 'walking', 20000), false)
  detector.process(position(5000), route, 'walking', 5000)
  assert.equal(detector.process(position(6000, { longitude: 0.02 }), route, 'walking', 6000), false)
  assert.equal(detector.process(position(7000), route, 'walking', 7000), false)
  assert.equal(detector.process(position(8000, { accuracy: null }), route, 'walking', 8000), false)
  assert.equal(detector.process(position(9000), route, 'walking', 9000), false)
  assert.equal(detector.process(position(10000), route, 'walking', 10000), false)
  assert.equal(detector.process(position(11000), route, 'walking', 11000), true)
})

test('a reading without a timestamp breaks the consecutive sequence', () => {
  const detector = createRouteArrivalDetector()
  detector.process(position(1000), route, 'walking', 1000)
  detector.process(position(null), route, 'walking', 2000)
  assert.equal(detector.process(position(3000), route, 'walking', 3000), false)
  assert.equal(detector.process(position(4000), route, 'walking', 4000), false)
  assert.equal(detector.process(position(5000), route, 'walking', 5000), true)
})

test('driving arrival requires reported low speed on all three readings', () => {
  const detector = createRouteArrivalDetector()
  detector.process(position(1000, { speed: null }), route, 'driving', 1000)
  assert.equal(detector.process(position(2000, { speed: 0 }), route, 'driving', 2000), false)
  assert.equal(detector.process(position(3000, { speed: 0 }), route, 'driving', 3000), false)
  assert.equal(detector.process(position(4000, { speed: 2 }), route, 'driving', 4000), false)
  assert.equal(detector.process(position(5000, { speed: 0 }), route, 'driving', 5000), false)
  assert.equal(detector.process(position(6000, { speed: 0 }), route, 'driving', 6000), false)
  assert.equal(detector.process(position(7000, { speed: 0 }), route, 'driving', 7000), true)
})
