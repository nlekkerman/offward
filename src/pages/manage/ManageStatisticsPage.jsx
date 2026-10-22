import { useEffect, useState } from 'react'
import { getManagementAnalytics } from '../../services/management/analyticsApi.js'

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
]

const CONTENT_GROUPS = [
  { key: 'routes', label: 'Routes' },
  { key: 'places', label: 'Places' },
  { key: 'stories', label: 'Stories' },
  { key: 'food', label: 'Food' },
]

function formatNumber(value) {
  return new Intl.NumberFormat().format(value)
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  return typeof error?.message === 'string' ? error.message : 'Unable to load statistics.'
}

function ManageStatisticsPage() {
  const [period, setPeriod] = useState('7d')
  const [retryCount, setRetryCount] = useState(0)
  const [reportState, setReportState] = useState({ requestKey: null, status: 'loading', report: null, error: '' })
  const requestKey = `${period}:${retryCount}`

  useEffect(() => {
    let isCurrent = true

    getManagementAnalytics(period)
      .then((report) => {
        if (isCurrent) setReportState({ requestKey, status: 'success', report, error: '' })
      })
      .catch((error) => {
        if (isCurrent) setReportState({ requestKey, status: 'error', report: null, error: getErrorMessage(error) })
      })

    return () => {
      isCurrent = false
    }
  }, [period, requestKey, retryCount])

  const retry = () => setRetryCount((count) => count + 1)
  const currentReportState = reportState.requestKey === requestKey
    ? reportState
    : { status: 'loading', report: null, error: '' }

  return (
    <section className="management-page management-statistics-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Statistics</h1>
        </div>
      </div>

      <div className="management-statistics-periods" role="group" aria-label="Statistics date range">
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`secondary-button${period === item.value ? ' is-selected' : ''}`}
            aria-pressed={period === item.value}
            onClick={() => setPeriod(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {currentReportState.status === 'loading' && (
        <div className="management-loading" role="status">Loading statistics…</div>
      )}

      {currentReportState.status === 'error' && (
        <div className="management-error" role="alert">
          <p>{currentReportState.error}</p>
          <button type="button" className="secondary-button" onClick={retry}>Retry</button>
        </div>
      )}

      {currentReportState.status === 'success' && (
        <StatisticsReport report={currentReportState.report} period={period} />
      )}
    </section>
  )
}

function StatisticsReport({ report, period }) {
  const trendDates = report.trend_range
  const dateRange = report.date_range

  return (
    <>
      <p className="management-statistics-range">
        Reporting timezone: <strong>{report.timezone}</strong>
        {' · '}Period: <strong>{dateRange.start_date === null
          ? `All available history through ${dateRange.end_date}`
          : `${dateRange.start_date} – ${dateRange.end_date}`}</strong>
        {period === 'all' && (
          <span> · The trend is limited to the most recent 90 days ({trendDates.start_date} – {trendDates.end_date}).</span>
        )}
      </p>
      <p className="management-statistics-definition">
        Visits are qualifying browser document navigations, not unique people.
      </p>

      <div className="management-statistics-summary">
        <SummaryCard label="Visits" value={report.totals.visits} />
        <SummaryCard label="Page views" value={report.totals.page_views} />
      </div>

      <section className="management-statistics-section" aria-labelledby="statistics-trends-title">
        <h2 id="statistics-trends-title">Daily activity</h2>
        {report.trends.length === 0 ? (
          <p className="management-empty">No daily activity is available for this period.</p>
        ) : (
          <div className="management-statistics-table-wrap">
            <table className="management-statistics-table">
              <caption>Visits and page views by date ({report.timezone})</caption>
              <thead>
                <tr><th scope="col">Date</th><th scope="col">Visits</th><th scope="col">Page views</th></tr>
              </thead>
              <tbody>
                {report.trends.map((trend) => (
                  <tr key={trend.date}>
                    <th scope="row">{trend.date}</th>
                    <td>{formatNumber(trend.visits)}</td>
                    <td>{formatNumber(trend.page_views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="management-statistics-section" aria-labelledby="statistics-content-title">
        <h2 id="statistics-content-title">Most viewed content</h2>
        <div className="management-statistics-content-grid">
          {CONTENT_GROUPS.map((group) => (
            <section className="management-statistics-card" key={group.key} aria-labelledby={`statistics-${group.key}`}>
              <h3 id={`statistics-${group.key}`}>{group.label}</h3>
              {report.top_content[group.key].length === 0 ? (
                <p className="management-statistics-empty">No views recorded.</p>
              ) : (
                <ol>
                  {report.top_content[group.key].map((item) => (
                    <li key={item.uuid}>
                      <span>{item.title}</span>
                      <strong>{formatNumber(item.page_views)} views</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </section>

      <section className="management-statistics-section" aria-labelledby="statistics-interactions-title">
        <h2 id="statistics-interactions-title">Interaction activations</h2>
        <dl className="management-statistics-interactions">
          <div><dt>Directions</dt><dd>{formatNumber(report.interactions.directions)}</dd></div>
          <div><dt>Track</dt><dd>{formatNumber(report.interactions.track)}</dd></div>
          <div><dt>Related content</dt><dd>{formatNumber(report.interactions.related_content)}</dd></div>
        </dl>
      </section>
    </>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="management-statistics-summary-card">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  )
}

export default ManageStatisticsPage
