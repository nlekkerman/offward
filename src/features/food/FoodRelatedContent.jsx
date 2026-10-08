import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { getPublicRouteContext, publicPlaceCatalog, publicRouteCatalog, publicStoryCatalog } from './publicRelationshipCatalog.js'
import { nextRouteContextBatch, publicRelationshipIds, resolvePublicRouteChildren } from './publicFoodResolution.js'
import { collectionPreview, imagePreviewUrl, imageUrl } from '../management/imageCollectionUtils.js'
import usePublicCountries from './usePublicCountries.js'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import { formatCountryLabel } from '../home/latestContentFormatting.js'

function useCatalog(catalog, enabled) {
  const state = useSyncExternalStore(catalog.subscribe, catalog.getSnapshot, catalog.getSnapshot)
  useEffect(() => {
    if (enabled && state.status === 'idle') catalog.loadNext().catch(() => {})
  }, [catalog, enabled, state.status])
  return state
}

function RelationshipGroup({ ids, catalog, title, path }) {
  const wanted = publicRelationshipIds(ids)
  const state = useCatalog(catalog, wanted.length > 0)
  const { countries } = usePublicCountries()
  if (!wanted.length) return null
  const byId = new Map(state.records.filter((record) => record.slug).map((record) => [String(record.id), record]))
  const found = wanted.map((id) => byId.get(id)).filter(Boolean)
  const unresolved = wanted.length - found.length
  return (
    <section className="food-related-content" aria-label={`Related ${title}`}>
      <h2>Related {title}</h2>
      {found.length > 0 && (path === 'stories'
        ? <ul className="food-link-list">{found.map((record) => <li key={record.id}><Link to={`/${path}/${encodeURIComponent(record.slug)}`}>{record.title || record.name || title}</Link></li>)}</ul>
        : <div className="story-related-grid">{found.map((record) => {
          const preview = imageUrl(record.hero_image) || imagePreviewUrl(record.preview_image) || collectionPreview(record.image_collections?.[0]) || record.preview_image_url
          const country = findCountry(countries, record.country)
          const countryLabel = country?.name || formatCountryLabel(record.country)
          return <Link key={record.id} className="story-related-card" to={`/${path}/${encodeURIComponent(record.slug)}`}>
            {preview && <span className="story-related-card-media"><img src={preview} alt="" loading="lazy" /></span>}
            <span className="story-related-card-body"><span className="story-related-card-eyebrow">{path === 'places' ? 'Place' : 'Route'}</span><span className="story-related-card-title">{record.title || record.name}</span>{countryLabel && <span className="story-related-card-meta country-identity-inline"><CountryFlag code={country?.code} decorative />{countryLabel}</span>}</span>
          </Link>
        })}</div>)}
      {unresolved > 0 && <div className="food-relationship-status" aria-live="polite">
        <p>{unresolved} linked {title.toLowerCase()} {unresolved === 1 ? 'item remains' : 'items remain'} unresolved.{state.bounded ? ' Only the first public Story response is available through the existing helper; later pages cannot be checked here.' : state.page && !state.next ? ' No further public pages are available; these items may be unpublished.' : ' Lookup is limited to loaded public pages.'}</p>
        {state.status === 'loading' && <p role="status">Loading related {title.toLowerCase()}…</p>}
        {state.status === 'error' && <p role="alert">Unable to check related {title.toLowerCase()}.</p>}
        {(!state.page || state.next) && <button type="button" className="food-button" disabled={state.status === 'loading'} onClick={() => catalog.loadNext().catch(() => {})}>{state.status === 'error' ? 'Retry lookup' : `Load next ${title.toLowerCase()} page`}</button>}
      </div>}
    </section>
  )
}

function ChildRelationships({ waypointIds, segmentIds }) {
  const wantedWaypoints = publicRelationshipIds(waypointIds)
  const wantedSegments = publicRelationshipIds(segmentIds)
  const state = useCatalog(publicRouteCatalog, wantedWaypoints.length + wantedSegments.length > 0)
  const [contexts, setContexts] = useState(new Map())
  const [lookup, setLookup] = useState({ loading: false, failed: [] })
  const batch = nextRouteContextBatch(state.records, contexts)
  const uniqueLinks = resolvePublicRouteChildren(contexts, wantedWaypoints, wantedSegments)
  const unresolved = wantedWaypoints.length + wantedSegments.length - uniqueLinks.length
  const inspectContexts = async () => {
    if (lookup.loading) return
    // At most four saved public Routes per click, never an automatic crawl.
    setLookup({ loading: true, failed: [] })
    const results = await Promise.allSettled(batch.map(getPublicRouteContext))
    const resolved = new Map()
    const failed = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') resolved.set(String(batch[index].id), result.value)
      else failed.push(batch[index].id)
    })
    setContexts((current) => new Map([...current, ...resolved]))
    setLookup({ loading: false, failed })
  }

  if (!wantedWaypoints.length && !wantedSegments.length) return null
  return (
    <section className="food-related-content" aria-label="Related Waypoints and Segments">
      <h2>Along the Route</h2>
      {uniqueLinks.length > 0 && <ul className="food-link-list">{uniqueLinks.map((link) => <li key={link.key}><Link to={link.to}>{link.title}</Link>{link.routeTitle && <span> — {link.routeTitle}</span>}</li>)}</ul>}
      {unresolved > 0 && <div className="food-relationship-status" aria-live="polite">
        <p>{unresolved} linked Waypoint/Segment {unresolved === 1 ? 'needs' : 'items need'} a verified public parent Route before a link can be shown. Only loaded Route pages and explicitly checked contexts are searched.</p>
        {(state.status === 'loading' || lookup.loading) && <p role="status">Checking public Route context…</p>}
        {(state.status === 'error' || lookup.failed.length > 0) && <p role="alert">Some public Route context could not be loaded. Retry the lookup.</p>}
        {batch.length > 0 && <button type="button" className="food-button" disabled={lookup.loading || state.status === 'loading'} onClick={inspectContexts}>{lookup.failed.length ? 'Retry Route contexts' : `Check next ${batch.length} loaded Route contexts`}</button>}
        {(!state.page || state.next) && <button type="button" className="food-button" disabled={lookup.loading || state.status === 'loading'} onClick={() => publicRouteCatalog.loadNext().catch(() => {})}>{state.status === 'error' ? 'Retry Route catalog' : 'Load next Route page'}</button>}
        {state.page > 0 && !state.next && !batch.length && !lookup.loading && <p>No more public Route contexts are available. These relationships may be unpublished or unavailable.</p>}
      </div>}
    </section>
  )
}

function FoodRelatedContent({ food }) {
  return (
    <div className="food-relationships">
      <RelationshipGroup ids={food.place_ids} catalog={publicPlaceCatalog} title="Places" path="places" />
      <RelationshipGroup ids={food.route_ids} catalog={publicRouteCatalog} title="Routes" path="routes" />
      <RelationshipGroup ids={food.story_ids} catalog={publicStoryCatalog} title="Stories" path="stories" />
      <ChildRelationships key={food.id || food.slug} waypointIds={food.waypoint_ids} segmentIds={food.segment_ids} />
    </div>
  )
}

export default FoodRelatedContent
