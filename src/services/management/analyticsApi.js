import { apiClient } from '../apiClient.js'

const PERIODS = new Set(['today', '7d', '30d', 'all'])
const CONTENT_GROUPS = ['routes', 'places', 'stories', 'food']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function isDateRange(value) {
  return value && DATE_PATTERN.test(value.start_date) && DATE_PATTERN.test(value.end_date)
}

function validateReport(data, period) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Analytics report response must be an object.')
  }
  if (data.period !== period || typeof data.timezone !== 'string' || !data.timezone.trim()) {
    throw new Error('Analytics report response has an invalid period or timezone.')
  }
  if (!isDateRange(data.date_range) || !isDateRange(data.trend_range)) {
    throw new Error('Analytics report response has an invalid date range.')
  }
  if (!data.totals || !isCount(data.totals.visits) || !isCount(data.totals.page_views)) {
    throw new Error('Analytics report response has invalid totals.')
  }
  if (!Array.isArray(data.trends) || data.trends.some((trend) => (
    !trend ||
    !DATE_PATTERN.test(trend.date) ||
    !isCount(trend.visits) ||
    !isCount(trend.page_views)
  ))) {
    throw new Error('Analytics report response has invalid daily trends.')
  }
  if (!data.top_content || CONTENT_GROUPS.some((group) => !Array.isArray(data.top_content[group]))) {
    throw new Error('Analytics report response has invalid top-content groups.')
  }
  for (const group of CONTENT_GROUPS) {
    if (data.top_content[group].some((item) => (
      !item ||
      typeof item.uuid !== 'string' ||
      !UUID_PATTERN.test(item.uuid) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      !isCount(item.page_views)
    ))) {
      throw new Error(`Analytics report response has an invalid ${group} entry.`)
    }
  }
  if (
    !data.interactions ||
    !isCount(data.interactions.directions) ||
    !isCount(data.interactions.track) ||
    !isCount(data.interactions.related_content)
  ) {
    throw new Error('Analytics report response has invalid interaction totals.')
  }

  return data
}

export async function getManagementAnalytics(period = '7d') {
  if (!PERIODS.has(period)) {
    throw new Error(`Unsupported analytics period: ${period}`)
  }

  const { data } = await apiClient.get('/api/offward/manage/analytics/', {
    params: { period },
  })
  return validateReport(data, period)
}
