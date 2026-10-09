import { formatActivityLabel } from '../home/latestContentFormatting.js'

const ACTIVITIES = ['motorcycle', 'hiking', 'car', 'boat', 'cycling', 'walking']

export default function ExploreFilters({ mode, countries, countriesStatus, country, activity, onChange, onRetry }) {
  return (
    <div className="explore-discovery-filters" role="group" aria-label="Explore filters">
      <label className="explore-discovery-field">
        <span>Country</span>
        <select value={country} className={country ? 'is-filtered' : ''} onChange={(event) => onChange({ country: event.target.value })}>
          <option value="">All countries</option>
          {country && !countries.some((item) => item.slug === country || String(item.id) === country) && <option value={country}>{country}</option>}
          {countries.filter((item) => item.status === 'active' || item.status === 'upcoming').map((item) => (
            <option key={item.id} value={item.slug}>{item.name}</option>
          ))}
        </select>
      </label>
      {mode === 'routes' && (
        <label className="explore-discovery-field">
          <span>Activity</span>
          <select value={activity} className={activity ? 'is-filtered' : ''} onChange={(event) => onChange({ activity: event.target.value })}>
            <option value="">All activities</option>
            {ACTIVITIES.map((value) => <option key={value} value={value}>{formatActivityLabel(value)}</option>)}
          </select>
        </label>
      )}
      {(country || activity) && <button type="button" className="explore-text-action" onClick={() => onChange({ country: '', activity: '' })}>Clear filters</button>}
      {countriesStatus === 'error' && <p className="explore-discovery-status" role="status">Country filters unavailable. <button type="button" className="explore-text-action" onClick={onRetry}>Retry</button></p>}
    </div>
  )
}