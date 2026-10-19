import { lazy, Suspense, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExploreCategoryNav from './ExploreCategoryNav.jsx'
import ExploreFilters from '../features/explore/ExploreFilters.jsx'
import ExploreResults from '../features/explore/ExploreResults.jsx'
import useExploreData from '../features/explore/useExploreData.js'
import '../features/explore/explore.css'
import ListingPageHeader from '../shared/components/ListingPageHeader.jsx'

const ExploreMapBrowser = lazy(() => import('../features/explore/ExploreMapBrowser.jsx'))

function ExploreHeader({ mode, mapMode, onMapChange }) {
  const modeLabel = mode === 'routes' ? 'Routes' : 'Places'
  return (
    <ListingPageHeader
      eyebrow={`PUBLIC ${modeLabel.toUpperCase()}`}
      title={modeLabel}
      aside={<button type="button" className="explore-discovery-button" aria-pressed={mapMode} onClick={() => onMapChange(!mapMode)}>{mapMode ? 'Back to discovery' : 'View on map'}</button>}
    />
  )
}

function ExploreLanding({ title, children }) {
  return <section className="explore-discovery-landing" aria-labelledby="explore-results-title"><h2 id="explore-results-title">{title}</h2>{children}</section>
}

function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('view') === 'places' ? 'places' : 'routes'
  const [mapMode, setMapMode] = useState(false)
  const [selection, setSelection] = useState(null)
  const country = searchParams.get('country') || ''
  const activity = mode === 'routes' ? searchParams.get('activity') || '' : ''
  const { countries, countriesStatus, items, count, next, loadingMore, moreError, loadMore, status, retry } = useExploreData({ mode, country, activity, mapMode })
  const selectedId = status === 'success' && items.some((item) => item.id === selection) ? selection : null
  const filtered = Boolean(country || activity)
  const title = filtered || mapMode ? `${mode === 'routes' ? 'Routes' : 'Places'}${country ? ` in ${countries.find((item) => item.slug === country || String(item.id) === country)?.name || country}` : ''}` : mode === 'routes' ? 'Routes to Explore' : 'Places to Explore'

  function updateFilters(changes) {
    resetSelection()
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })
  }

  function resetSelection() {
    setSelection(null)
  }

  const results = <ExploreResults items={items} total={count} hasMore={next !== null} loadingMore={loadingMore} moreError={moreError} mode={mode} countries={countries} status={status} onRetry={retry} onMore={loadMore} selectedId={selectedId} onSelect={mapMode && country ? setSelection : undefined} />

  return (
    <section className="explore-page explore-discovery">
      <ExploreHeader mode={mode} mapMode={mapMode} onMapChange={(value) => { resetSelection(); setMapMode(value) }} />
      <ExploreCategoryNav activeView={mode} onViewChange={(view) => {
        if (view === mode) return
        resetSelection()
        setSearchParams((previous) => { const next = new URLSearchParams(previous); next.set('view', view); return next })
      }} />
      <ExploreFilters mode={mode} countries={countries} countriesStatus={countriesStatus} country={country} activity={activity} onChange={updateFilters} onRetry={retry} />
      {mapMode ? (
        <Suspense fallback={<p className="explore-discovery-status" role="status">Loading map browser...</p>}>
          <ExploreMapBrowser mode={mode} items={items} country={country} status={status} selectedId={selectedId} onSelect={setSelection} onReset={() => setSelection(null)}>
            <ExploreLanding title={title}>{results}</ExploreLanding>
          </ExploreMapBrowser>
        </Suspense>
      ) : <ExploreLanding title={title}>{results}</ExploreLanding>}
    </section>
  )
}

export default ExplorePage