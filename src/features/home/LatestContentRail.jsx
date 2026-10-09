import { useEffect, useState } from 'react'
import { getCountries } from '../../services/countriesApi.js'
import { getLatestPublicStory } from '../../services/storiesApi.js'
import { getPublicVideos } from '../../services/videosApi.js'
import LatestStoryCard from './LatestStoryCard.jsx'
import LatestVideoCard from './LatestVideoCard.jsx'
import './LatestContentRail.css'

async function loadLatestVideo() {
  const videos = await getPublicVideos()

  return videos
    .filter((video) => video.playback_url)
    .slice()
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))[0] || null
}

/**
 * Single horizontal rail for publicly visible content with a published date,
 * directly below the Home hero.
 */
function LatestContentRail() {
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])

  useEffect(() => {
    let isCurrent = true

    async function loadLatest() {
      const [videoResult, storyResult, countriesResult] = await Promise.allSettled([
        loadLatestVideo(),
        getLatestPublicStory(),
        getCountries(),
      ])

      if (!isCurrent) {
        return
      }

      const nextItems = []
      const countries = countriesResult.status === 'fulfilled' ? countriesResult.value : []

      if (videoResult.status === 'fulfilled' && videoResult.value) {
        nextItems.push({ key: `video-${videoResult.value.id}`, type: 'video', data: videoResult.value })
      }

      if (storyResult.status === 'fulfilled' && storyResult.value) {
        nextItems.push({ key: `story-${storyResult.value.id}`, type: 'story', data: storyResult.value, countries })
      }

      setItems(nextItems)
      setStatus('ready')
    }

    loadLatest()

    return () => {
      isCurrent = false
    }
  }, [])

  if (status === 'loading') {
    return (
      <section className="latest-content-rail" aria-hidden="true">
        <div className="latest-content-rail-header">
          <h2 className="latest-content-rail-title">Latest</h2>
        </div>
        <div className="latest-content-rail-track">
          <div className="latest-rail-skeleton" />
          <div className="latest-rail-skeleton" />
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <section className="latest-content-rail" aria-label="Latest content">
      <div className="latest-content-rail-header">
        <h2 className="latest-content-rail-title">Latest</h2>
      </div>
      <ul className="latest-content-rail-track">
        {items.map((item) => (
          <li className="latest-rail-item" key={item.key}>
            {item.type === 'video' && <LatestVideoCard video={item.data} />}
            {item.type === 'story' && <LatestStoryCard story={item.data} countryRecords={item.countries} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default LatestContentRail
