import { useEffect, useState } from 'react'
import { getCountries } from '../../services/countriesApi.js'
import { getPublicFoods } from '../../services/foodsApi.js'
import { getPublicPlaces } from '../../services/placesApi.js'
import { getPublicRoutes } from '../../services/routesApi.js'
import { getLatestPublicStory } from '../../services/storiesApi.js'
import { getPublicVideos } from '../../services/videosApi.js'
import LatestFoodCard from './LatestFoodCard.jsx'
import LatestPlaceCard from './LatestPlaceCard.jsx'
import LatestRouteCard from './LatestRouteCard.jsx'
import LatestStoryCard from './LatestStoryCard.jsx'
import LatestVideoCard from './LatestVideoCard.jsx'
import './LatestContentRail.css'

function newestItem(items) {
  return items
    .slice()
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))[0] || null
}

async function loadLatestVideo() {
  const videos = await getPublicVideos()

  return newestItem(videos.filter((video) => video.playback_url))
}

async function loadLatestRoute() {
  const page = await getPublicRoutes({ status: 'active', includeGeometry: true, page: 1, pageSize: 1 })
  return page.results[0] || null
}

async function loadLatestPlace() {
  const page = await getPublicPlaces({ page: 1, pageSize: 12 })
  return newestItem(page.results)
}

async function loadLatestFood() {
  const page = await getPublicFoods({ page: 1, page_size: 12 })
  return newestItem(page.results)
}

/**
 * Homepage previews from the existing public content endpoints.
 */
function LatestContentRail() {
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [failedSources, setFailedSources] = useState([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCurrent = true

    async function loadLatest() {
      const sources = [
        getLatestPublicStory(),
        loadLatestRoute(),
        loadLatestPlace(),
        loadLatestVideo(),
        loadLatestFood(),
        getCountries(),
      ]
      const results = await Promise.allSettled(sources)

      if (!isCurrent) {
        return
      }

      const nextItems = []
      const [storyResult, routeResult, placeResult, videoResult, foodResult, countriesResult] = results
      const countries = countriesResult.status === 'fulfilled' ? countriesResult.value : []
      const contentResults = [
        ['story', storyResult],
        ['route', routeResult],
        ['place', placeResult],
        ['video', videoResult],
        ['food', foodResult],
      ]

      for (const [type, result] of contentResults) {
        if (result.status === 'fulfilled' && result.value) {
          nextItems.push({
            key: `${type}-${result.value.id || result.value.slug || type}`,
            type,
            data: result.value,
            countries,
          })
        }
      }

      setFailedSources(results.flatMap((result, index) => (
        result.status === 'rejected'
          ? [index < 5 ? ['Stories', 'Routes', 'Places', 'Videos', 'Food'][index] : 'Country details']
          : []
      )))
      setItems(nextItems)
      setStatus('ready')
    }

    loadLatest()

    return () => {
      isCurrent = false
    }
  }, [attempt])

  if (status === 'loading') {
    return (
      <section className="latest-content-rail" aria-label="Latest">
        <div className="latest-content-rail-header">
          <h2 className="latest-content-rail-title">Latest</h2>
        </div>
        <div className="latest-content-rail-track" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <div className="latest-rail-skeleton" key={index} />)}
        </div>
      </section>
    )
  }

  return (
    <section className="latest-content-rail" aria-label="Latest content">
      <div className="latest-content-rail-header">
        <h2 className="latest-content-rail-title">Latest</h2>
      </div>
      {failedSources.length > 0 && (
        <div className="latest-content-error" role="alert">
          <p>Some latest content could not be loaded ({failedSources.join(', ')}).</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              setAttempt((value) => value + 1)
            }}
          >
            Retry
          </button>
        </div>
      )}
      {items.length > 0 ? (
        <ul
          className="latest-content-rail-track"
          style={{ '--latest-column-count': items.length }}
        >
          {items.map((item) => (
            <li className={`latest-rail-item latest-rail-item-${item.type}`} key={item.key}>
              {item.type === 'story' && <LatestStoryCard story={item.data} countryRecords={item.countries} />}
              {item.type === 'route' && <LatestRouteCard route={item.data} countryRecords={item.countries} />}
              {item.type === 'place' && <LatestPlaceCard place={item.data} countryRecords={item.countries} />}
              {item.type === 'video' && <LatestVideoCard video={item.data} />}
              {item.type === 'food' && <LatestFoodCard food={item.data} countryRecords={item.countries} />}
            </li>
          ))}
        </ul>
      ) : failedSources.length === 0 ? (
        <p className="latest-content-empty">No public content is available yet.</p>
      ) : null}
    </section>
  )
}

export default LatestContentRail
