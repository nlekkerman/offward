import { lazy, Suspense, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExploreCategoryNav from './ExploreCategoryNav.jsx'
import ExploreFilters from '../features/explore/ExploreFilters.jsx'
import ExploreResults from '../features/explore/ExploreResults.jsx'
import useExploreData from '../features/explore/useExploreData.js'
import '../features/explore/explore.css'

const ExploreMapBrowser = lazy(() => import('../features/explore/ExploreMapBrowser.jsx'))

function ExploreHeader({ mapMode, onMapChange }) {
  return (
    <header className="explore-discovery-heading">
      <div><p className="explore-discovery-eyebrow">Offward / Discovery</p><h1>Explore</h1></div>
      <button type="button" className="explore-discovery-button" aria-pressed={mapMode} onClick={() => onMapChange(!mapMode)}>{mapMode ? 'Back to discovery' : 'View on map'}</button>
    </header>
  )
}

function ExploreLanding({ title, children }) {
  return <section className="explore-discovery-landing" aria-labelledby="explore-results-title"><h2 id="explore-results-title">{title}</h2>{children}</section>
}

function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('view') === 'places' ? 'places' : 'routes'
  const [mapMode, setMapMode] = useState(false)
  const [filters, setFilters] = useState({ country: '', activity: '' })
  const [selection, setSelection] = useState(null)
  const activity = mode === 'routes' ? filters.activity : ''
  const { countries, countriesStatus, items, count, next, loadingMore, moreError, loadMore, status, retry } = useExploreData({ mode, country: filters.country, activity, mapMode })
  const selectedId = status === 'success' && items.some((item) => item.id === selection) ? selection : null
  const filtered = Boolean(filters.country || activity)
  const title = filtered || mapMode ? `${mode === 'routes' ? 'Routes' : 'Places'}${filters.country ? ` in ${countries.find((country) => country.slug === filters.country)?.name || filters.country}` : ''}` : mode === 'routes' ? 'Latest Routes' : 'Places to Explore'

  function resetSelection() {
    setSelection(null)
  }

  const results = <ExploreResults items={items} total={count} hasMore={next !== null} loadingMore={loadingMore} moreError={moreError} mode={mode} countries={countries} status={status} onRetry={retry} onMore={loadMore} selectedId={selectedId} onSelect={mapMode && filters.country ? setSelection : undefined} />

  return (
    <section className="explore-page explore-discovery">
      <ExploreHeader mapMode={mapMode} onMapChange={(value) => { resetSelection(); setMapMode(value) }} />
      <ExploreCategoryNav activeView={mode} onViewChange={(view) => {
        if (view === mode) return
        resetSelection()
        setSearchParams((previous) => { const next = new URLSearchParams(previous); next.set('view', view); return next })
      }} />
      <ExploreFilters mode={mode} countries={countries} countriesStatus={countriesStatus} country={filters.country} activity={activity} onChange={(changes) => { resetSelection(); setFilters((previous) => ({ ...previous, ...changes })) }} onRetry={retry} />
      {mapMode ? (
        <Suspense fallback={<p className="explore-discovery-status" role="status">Loading map browser...</p>}>
          <ExploreMapBrowser mode={mode} items={items} country={filters.country} status={status} selectedId={selectedId} onSelect={setSelection} onReset={() => setSelection(null)}>
            <ExploreLanding title={title}>{results}</ExploreLanding>
          </ExploreMapBrowser>
        </Suspense>
      ) : <ExploreLanding title={title}>{results}</ExploreLanding>}
    </section>
  )
}

export default ExplorePage