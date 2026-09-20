import { useCallback, useState } from 'react'
import './VideoPlayer.css'

function withAutoplay(url) {
  try {
    const parsed = new URL(url, window.location.origin)
    parsed.searchParams.set('autoplay', 'true')
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Provider-neutral video player shell. Consumes only presentation URLs
 * (playbackUrl/thumbnailUrl/title) so it can be reused for Video management
 * preview, Story, Route, Place, Event, Reel, and future Live surfaces.
 */
function VideoPlayer({ playbackUrl, thumbnailUrl, title, className = '' }) {
  const [isActivated, setIsActivated] = useState(false)
  const [isFrameLoading, setIsFrameLoading] = useState(false)

  const hasPlayback = Boolean(playbackUrl)
  const accessibleTitle = title?.trim() || 'Video'

  const handleActivate = useCallback(() => {
    if (!hasPlayback) return
    setIsActivated(true)
    setIsFrameLoading(true)
  }, [hasPlayback])

  const handleFrameLoad = useCallback(() => {
    setIsFrameLoading(false)
  }, [])

  return (
    <div className={`video-player ${className}`.trim()}>
      <div className="video-player-frame">
        {!hasPlayback && (
          <div className="video-player-unavailable">
            <span>Video unavailable</span>
          </div>
        )}

        {hasPlayback && !isActivated && (
          <button
            type="button"
            className="video-player-poster"
            onClick={handleActivate}
            aria-label={`Play ${accessibleTitle}`}
          >
            {thumbnailUrl ? (
              <img
                className="video-player-thumbnail"
                src={thumbnailUrl}
                alt={accessibleTitle}
                loading="lazy"
              />
            ) : (
              <div className="video-player-thumbnail video-player-thumbnail-fallback" aria-hidden="true" />
            )}
            <span className="video-player-play-control" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" focusable="false">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </span>
          </button>
        )}

        {hasPlayback && isActivated && (
          <>
            {isFrameLoading && (
              <div className="video-player-loading" role="status" aria-live="polite">
                <span className="video-player-spinner" aria-hidden="true" />
                <span className="visually-hidden">Loading video…</span>
              </div>
            )}
            <iframe
              className="video-player-iframe"
              src={withAutoplay(playbackUrl)}
              title={accessibleTitle}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              onLoad={handleFrameLoad}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default VideoPlayer
