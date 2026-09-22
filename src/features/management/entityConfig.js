export const entityConfig = {
  countries: {
    label: 'Country',
    singular: 'country',
    listFields: ['name', 'code', 'status'],
    defaultValues: {
      name: '',
      slug: '',
      code: '',
      summary: '',
      status: 'active',
      hero_media_id: '',
    },
  },
  places: {
    label: 'Place',
    singular: 'place',
    listFields: ['name', 'country', 'status', 'visited_at'],
    defaultValues: {
      country: '',
      name: '',
      slug: '',
      summary: '',
      body: '',
      latitude: '',
      longitude: '',
      visited_at: '',
      status: 'active',
      video_ids: [],
      image_collection_ids: [],
    },
  },
  routes: {
    label: 'Route',
    singular: 'route',
    listFields: ['title', 'country', 'activity_type', 'status'],
    defaultValues: {
      country: '',
      title: '',
      slug: '',
      summary: '',
      activity_type: 'motorcycle',
      status: 'active',
      path: '',
      places: [],
      video_ids: [],
      image_collection_ids: [],
    },
  },
  stories: {
    label: 'Story',
    singular: 'story',
    listFields: ['title', 'country', 'published_at', 'status'],
    defaultValues: {
      country: '',
      title: '',
      slug: '',
      excerpt: '',
      body: '',
      published_at: '',
      status: 'draft',
      places: [],
      routes: [],
      events: [],
      tours: [],
      videos: [],
      video_ids: [],
      image_collection_ids: [],
      hero_image_id: null,
    },
  },
  videos: {
    label: 'Video',
    singular: 'video',
    listFields: ['title', 'provider', 'duration', 'published_at', 'status'],
    defaultValues: {
      title: '',
      slug: '',
      provider: 'cloudflare',
      provider_id: '',
      thumbnail: '',
      duration: '',
      published_at: '',
      status: 'draft',
      location: {
        latitude: '',
        longitude: '',
        place_id: '',
        route_id: '',
        segment_id: '',
        captured_at: '',
      },
    },
  },
  tours: {
    label: 'Tour',
    singular: 'tour',
    listFields: ['title', 'country', 'enquiry_open', 'status'],
    defaultValues: {
      country: '',
      title: '',
      slug: '',
      summary: '',
      enquiry_open: true,
      status: 'draft',
      routes: [],
      places: [],
      videos: [],
      video_ids: [],
    },
  },
  events: {
    label: 'Event',
    singular: 'event',
    listFields: ['title', 'country', 'lifecycle_status', 'starts_at', 'status'],
    defaultValues: {
      country: '',
      type: 'expedition',
      title: '',
      slug: '',
      summary: '',
      starts_at: '',
      ends_at: '',
      lifecycle_status: 'upcoming',
      status: 'draft',
      routes: [],
      places: [],
      partners: [],
      videos: [],
      video_ids: [],
    },
  },
  partners: {
    label: 'Partner',
    singular: 'partner',
    listFields: ['name', 'website', 'status'],
    defaultValues: {
      name: '',
      slug: '',
      website: '',
      logo_media_id: '',
      summary: '',
      status: 'active',
    },
  },
}

export function getEntityConfig(resourceKey) {
  return entityConfig[resourceKey] || entityConfig.countries
}

export function resourceTitle(resourceKey) {
  return getEntityConfig(resourceKey).label
}

export function normalizeDisplayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—'
  }

  if (typeof value === 'object') {
    if (value.name) {
      return value.name
    }
    if (value.title) {
      return value.title
    }
    return JSON.stringify(value)
  }

  return String(value)
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getRelationshipOptions(resourceKey) {
  const mapping = {
    places: ['country'],
    routes: ['country', 'places'],
    stories: ['country', 'places', 'routes', 'events', 'tours', 'videos'],
    videos: ['places', 'routes'],
    tours: ['country', 'routes', 'places', 'videos'],
    events: ['country', 'routes', 'places', 'partners', 'videos'],
  }

  return mapping[resourceKey] || []
}
