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
    },
  },
  videos: {
    label: 'Video',
    singular: 'video',
    listFields: ['title', 'provider', 'duration', 'status'],
    defaultValues: {
      title: '',
      slug: '',
      provider: 'cloudflare',
      provider_id: '',
      thumbnail: '',
      duration: '',
      published_at: '',
      status: 'draft',
      playback_url: '',
      thumbnail_url: '',
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
    country: ['countries'],
    countries: ['countries'],
    places: ['places'],
    routes: ['routes'],
    events: ['events'],
    partners: ['partners'],
    tours: ['tours'],
    videos: ['videos'],
  }

  return mapping[resourceKey] || []
}
