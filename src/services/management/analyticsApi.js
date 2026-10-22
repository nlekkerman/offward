import { apiClient } from '../apiClient.js'

const PERIODS = new Set(['today', '7d', '30d', 'all'])
const CONTENT_GROUPS = ['routes', 'places', 'stories', 'food']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function isDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12) return false

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= daysInMonth[month - 1]
}

function isValidRange(startDate, endDate) {
  return isDate(startDate) && isDate(endDate) && startDate <= endDate
}

function isDateRange(value, period) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !isDate(value.end_date)) {
    return false
  }

  if (value.start_date === null) return period === 'all'
  return isValidRange(value.start_date, value.end_date)
}

function validateReport(data, period) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Analytics report response must be an object.')
  }
  if (data.period !== period || typeof data.timezone !== 'string' || !data.timezone.trim()) {
    throw new Error('Analytics report response has an invalid period or timezone.')
  }
  if (!isDateRange(data.date_range, period) || !isDateRange(data.trend_range, null)) {
    throw new Error('Analytics report response has an invalid date range.')
  }
  if (!data.totals || !isCount(data.totals.visits) || !isCount(data.totals.page_views)) {
    throw new Error('Analytics report response has invalid totals.')
  }
  if (!Array.isArray(data.trends) || data.trends.some((trend) => (
    !trend ||
    !isDate(trend.date) ||
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
