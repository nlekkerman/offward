import { useState } from 'react'
import VideoPlayer from '../../video/VideoPlayer.jsx'

// Compact previews; Play expands one video to a full-width player. Only the
// expanded item mounts VideoPlayer, so collapsing unmounts the iframe and stops playback.
function RouteMediaGrid({ videos = [], className = '' }) {
  const [expandedVideoId, setExpandedVideoId] = useState(null)

  if (videos.length === 0) {
    return null
  }

  return (
    <div className={`route-media-grid ${className}`.trim()}>
      {videos.map((video) => {
        const videoId = String(video.id)
        const title = video.title?.trim() || 'Video'

        if (videoId === expandedVideoId) {
          return (
            <div className="route-media-item is-expanded" key={videoId}>
              <div className="route-media-expanded-header">
                <p className="route-media-caption">
                  <span className="route-media-caption-title">{title}</span>
                  {video.duration && <span className="route-media-caption-duration">{video.duration}</span>}
                </p>
                <button type="button" className="route-media-collapse" onClick={() => setExpandedVideoId(null)}>
                  Collapse
                </button>
              </div>
              <VideoPlayer
                className="route-media-player"
                playbackUrl={video.playback_url}
                thumbnailUrl={video.thumbnail_url}
                title={title}
                autoPlay
              />
            </div>
          )
        }

        return (
          <div className="route-media-item" key={videoId}>
            <button
              type="button"
              className="route-media-preview"
              onClick={() => setExpandedVideoId(videoId)}
              aria-label={`Play ${title}`}
            >
              {video.thumbnail_url ? (
                <img className="route-media-thumbnail" src={video.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <span className="route-media-thumbnail route-media-thumbnail-fallback" aria-hidden="true" />
              )}
              <span className="route-media-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" focusable="false">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
                Play
              </span>
            </button>
            <p className="route-media-caption">
              <span className="route-media-caption-title">{title}</span>
              {video.duration && <span className="route-media-caption-duration">{video.duration}</span>}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default RouteMediaGrid
