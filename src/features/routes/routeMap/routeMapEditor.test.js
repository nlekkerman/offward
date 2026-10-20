import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let server

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
})

after(async () => {
  await server?.close()
})

test('manual connection geometry keeps exact endpoints and intermediate coordinates', async () => {
  const { buildManualSegmentGeometry } = await server.ssrLoadModule('/src/features/routes/routeMap/routeMapUtils.js')
  const geometry = buildManualSegmentGeometry(
    { latitude: '51.123456789', longitude: '-1.23456789' },
    { latitude: '52.987654321', longitude: '2.34567891' },
    [{ lat: 51.555555555, lng: 0.111111111 }],
  )

  assert.deepEqual(geometry, {
    type: 'LineString',
    coordinates: [
      [-1.23456789, 51.123456789],
      [0.111111111, 51.555555555],
      [2.34567891, 52.987654321],
    ],
  })
})

test('canonical waypoint payload retains saved UUIDs and order', async () => {
  const { buildWaypointPayload } = await server.ssrLoadModule('/src/features/routes/routeMap/routeMapUtils.js')
  const payload = buildWaypointPayload([
    { id: 'waypoint-uuid-a', order: 1, type: 'start', latitude: '51.5', longitude: '-1.2' },
    { id: 'waypoint-uuid-b', order: 2, type: 'finish', latitude: '52.5', longitude: '0.2' },
  ])

  assert.deepEqual(payload.map(({ id, order }) => ({ id, order })), [
    { id: 'waypoint-uuid-a', order: 1 },
    { id: 'waypoint-uuid-b', order: 2 },
  ])
})

test('connection controls expose individual and unresolved connections', async () => {
  const { default: SegmentList } = await server.ssrLoadModule('/src/features/routes/routeMap/components/SegmentList.jsx')
  const connections = [
    {
      id: 'segment-one',
      key: 'waypoint-one:waypoint-two',
      start: { order: 1 },
      end: { order: 2 },
      segment: { id: 'segment-one', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, mode: 'manual' },
    },
    {
      id: 'segment-two',
      key: 'waypoint-two:waypoint-three',
      start: { order: 2 },
      end: { order: 3 },
      segment: { id: 'segment-two', geometry: null, mode: '' },
    },
  ]
  const html = renderToStaticMarkup(createElement(SegmentList, {
    connections,
    routeComplete: false,
    selectedConnectionId: 'segment-two',
    profile: 'walking',
    onSelect() {},
  }))

  assert.match(html, /Waypoint 1 → Waypoint 2/)
  assert.match(html, /Waypoint 2 → Waypoint 3/)
  assert.match(html, /Resolved manually/)
  assert.match(html, /Unresolved/)
  assert.match(html, /aria-selected="true"/)
  assert.match(html, /Incomplete/)
})

test('calculated previews expose accept, cancel, recalculate, and returned metrics', async () => {
  const { default: SegmentList } = await server.ssrLoadModule('/src/features/routes/routeMap/components/SegmentList.jsx')
  const connection = {
    id: 'segment-uuid',
    start: { order: 2 },
    end: { order: 3 },
    segment: { id: 'segment-uuid', geometry: null, mode: '' },
  }
  const html = renderToStaticMarkup(createElement(SegmentList, {
    connections: [connection],
    routeComplete: false,
    selectedConnectionId: connection.id,
    profile: 'walking',
    preview: {
      mode: 'calculated',
      geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] },
      candidateToken: 'signed-token',
      distance_meters: 2500,
      duration_seconds: 1800,
    },
  }))

  assert.match(html, /2\.5 km/)
  assert.match(html, /30 min/)
  assert.match(html, />Accept<\/button>/)
  assert.match(html, />Recalculate<\/button>/)
  assert.match(html, />Cancel<\/button>/)
})

test('manual drawing and waypoint movement expose preview, Save, and Cancel controls', async () => {
  const { default: SegmentList } = await server.ssrLoadModule('/src/features/routes/routeMap/components/SegmentList.jsx')
  const connection = {
    id: 'segment-uuid',
    start: { order: 1 },
    end: { order: 2 },
    segment: { id: 'segment-uuid', geometry: null, mode: '' },
  }
  const drawingHtml = renderToStaticMarkup(createElement(SegmentList, {
    connections: [connection],
    routeComplete: false,
    selectedConnectionId: connection.id,
    profile: 'walking',
    drawing: { points: [{ lat: 1, lng: 2 }] },
    onFinishManual() {},
    onCancelManual() {},
  }))
  assert.match(drawingHtml, />Preview path<\/button>/)
  assert.match(drawingHtml, />Cancel<\/button>/)

  const moveHtml = renderToStaticMarkup(createElement(SegmentList, {
    connections: [connection],
    routeComplete: false,
    selectedConnectionId: connection.id,
    profile: 'walking',
    waypointMovePreview: { id: 'waypoint-uuid', latitude: 51, longitude: -1 },
    onSaveWaypointMove() {},
    onCancelWaypointMove() {},
  }))
  assert.match(moveHtml, /Only the connections before and after this waypoint will be invalidated/)
  assert.match(moveHtml, />Save waypoint<\/button>/)
  assert.match(moveHtml, />Cancel move<\/button>/)
})

test('complete canonical connections display a complete Route state', async () => {
  const { default: SegmentList } = await server.ssrLoadModule('/src/features/routes/routeMap/components/SegmentList.jsx')
  const html = renderToStaticMarkup(createElement(SegmentList, {
    connections: [{
      id: 'segment-uuid',
      start: { order: 1 },
      end: { order: 2 },
      segment: { id: 'segment-uuid', geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] }, mode: 'straight' },
    }],
    routeComplete: true,
    selectedConnectionId: 'segment-uuid',
    profile: 'walking',
  }))
  assert.match(html, /Complete/)
  assert.match(html, /Resolved straight/)
})

test('segment candidate request uses route revision and selected segment endpoint', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { routeMapApi } = await server.ssrLoadModule('/src/services/management/routeMapApi.js')
  const calls = []
  const originalPost = apiClient.post
  apiClient.post = async (...args) => {
    calls.push(args)
    return {
      data: {
        candidate_geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] },
        candidate_token: 'signed-token',
        distance_meters: 2500,
        duration_seconds: 1800,
        map_revision: 12,
      },
    }
  }

  try {
    const result = await routeMapApi.calculateSegmentCandidate('route-uuid', 'segment-uuid', 'walking', 12)
    assert.deepEqual(calls, [[
      '/api/offward/manage/routes/route-uuid/segments/segment-uuid/calculate-candidate/',
      { profile: 'walking', expected_map_revision: 12 },
    ]])
    assert.equal(result.candidate.candidateToken, 'signed-token')
    assert.equal(result.mapRevision, 12)
  } finally {
    apiClient.post = originalPost
  }
})

test('canonical map refresh reads route revision, waypoint IDs, segments, and completeness', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { routeMapApi } = await server.ssrLoadModule('/src/services/management/routeMapApi.js')
  const calls = []
  const originalGet = apiClient.get
  apiClient.get = async (path) => {
    calls.push(path)
    if (path.endsWith('/waypoints/')) {
      return { data: { map_revision: 21, waypoints: [{ id: 'waypoint-uuid', order: 1, coordinates: { lat: 51, lng: -1 } }] } }
    }
    if (path.endsWith('/segments/')) return { data: [{ id: 'segment-uuid', order: 1, start_waypoint_id: 'waypoint-uuid', end_waypoint_id: 'waypoint-next', geometry: null }] }
    return { data: { map_revision: 21, is_map_renderable: false, geometry: null } }
  }

  try {
    const map = await routeMapApi.getCanonicalMap('route-uuid')
    assert.equal(map.mapRevision, 21)
    assert.equal(map.isMapRenderable, false)
    assert.equal(map.waypoints[0].id, 'waypoint-uuid')
    assert.equal(map.segments[0].id, 'segment-uuid')
    assert.deepEqual(calls, [
      '/api/offward/manage/routes/route-uuid/',
      '/api/offward/manage/routes/route-uuid/waypoints/',
      '/api/offward/manage/routes/route-uuid/segments/',
    ])
  } finally {
    apiClient.get = originalGet
  }
})

test('waypoint collection PUT sends current revision at top level and returns refreshed Route revision', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { routeMapApi } = await server.ssrLoadModule('/src/services/management/routeMapApi.js')
  const calls = []
  const originalPut = apiClient.put
  const originalGet = apiClient.get
  apiClient.put = async (path, payload) => {
    calls.push(['put', path, payload])
    if (!payload || Array.isArray(payload) || !Number.isInteger(payload.expected_map_revision)) {
      throw {
        response: {
          status: 400,
          data: {
            errors: [{
              code: 'required',
              field: 'expected_map_revision[0]',
              message: 'This field is required.',
            }],
          },
        },
      }
    }
    return { data: { waypoints: payload.waypoints } }
  }
  apiClient.get = async (path) => {
    calls.push(['get', path])
    return { data: { map_revision: 13, geometry: null } }
  }

  try {
    const waypoints = [{
      id: 'waypoint-uuid',
      order: 1,
      type: 'start',
      latitude: '51',
      longitude: '-1',
    }]
    const result = await routeMapApi.updateWaypoints('route-uuid', waypoints, 12)
    assert.deepEqual(calls[0], [
      'put',
      '/api/offward/manage/routes/route-uuid/waypoints/',
      {
        expected_map_revision: 12,
        waypoints: [{
          id: 'waypoint-uuid',
          order: 1,
          type: 'start',
          coordinates: { lat: 51, lng: -1 },
          name: '',
          label: '',
          place_id: null,
          media_ids: [],
          image_collection_ids: [],
        }],
      },
    ])
    assert.equal(result.mapRevision, 13)
    assert.deepEqual(calls[1], ['get', '/api/offward/manage/routes/route-uuid/'])
    await assert.rejects(
      routeMapApi.updateWaypoints('route-uuid', waypoints, undefined),
      /current Route map revision is required/,
    )
    assert.equal(calls.length, 2)
  } finally {
    apiClient.put = originalPut
    apiClient.get = originalGet
  }
})

test('manual and straight writes PATCH only the selected connection', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { routeMapApi } = await server.ssrLoadModule('/src/services/management/routeMapApi.js')
  const calls = []
  const originalPatch = apiClient.patch
  apiClient.patch = async (...args) => {
    calls.push(args)
    return { data: { id: 'segment-uuid', mode: 'manual', map_revision: 13 } }
  }

  try {
    const geometry = { type: 'LineString', coordinates: [[1, 2], [2, 3], [4, 5]] }
    const manualResult = await routeMapApi.updateSegment('route-uuid', 'segment-uuid', {
      action: 'save_manual',
      geometry,
      expected_map_revision: 12,
    })
    const straightResult = await routeMapApi.updateSegment('route-uuid', 'segment-uuid', {
      action: 'generate_straight',
      expected_map_revision: 13,
    })

    assert.equal(manualResult.mapRevision, 13)
    assert.equal(straightResult.mapRevision, 13)
    assert.deepEqual(calls, [
      ['/api/offward/manage/routes/route-uuid/segments/segment-uuid/', {
        action: 'save_manual',
        geometry,
        expected_map_revision: 12,
      }],
      ['/api/offward/manage/routes/route-uuid/segments/segment-uuid/', {
        action: 'generate_straight',
        expected_map_revision: 13,
      }],
    ])
  } finally {
    apiClient.patch = originalPatch
  }
})

test('calculated acceptance PATCH sends only signed token and revision, not candidate geometry', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { routeMapApi } = await server.ssrLoadModule('/src/services/management/routeMapApi.js')
  const calls = []
  const originalPatch = apiClient.patch
  apiClient.patch = async (...args) => {
    calls.push(args)
    return { data: { id: 'segment-uuid', mode: 'calculated', map_revision: 14 } }
  }

  try {
    await routeMapApi.updateSegment('route-uuid', 'segment-uuid', {
      action: 'accept_calculated_candidate',
      candidate_token: 'signed-token',
      expected_map_revision: 13,
    })
    assert.deepEqual(calls[0][1], {
      action: 'accept_calculated_candidate',
      candidate_token: 'signed-token',
      expected_map_revision: 13,
    })
    assert.equal(Object.hasOwn(calls[0][1], 'geometry'), false)
  } finally {
    apiClient.patch = originalPatch
  }
})
