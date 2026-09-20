import VideoPlayer from '../../video/VideoPlayer.jsx'

// Compact, height-conscious, thumbnail-first Video grid reused for Route,
// Segment, and Waypoint media. VideoPlayer only mounts its actual player
// (iframe) once a poster is clicked, so rendering several of these never
// mounts more than one active player at a time.
function RouteMediaGrid({ videos = [], className = '' }) {
  if (videos.length === 0) {
    return null
  }

  return (
    <div className={`route-media-grid ${className}`.trim()}>
      {videos.map((video) => (
        <div className="route-media-item" key={video.id}>
          <VideoPlayer
            className="route-media-player"
            playbackUrl={video.playback_url}
            thumbnailUrl={video.thumbnail_url}
            title={video.title}
          />
          {(video.title || video.duration) && (
            <p className="route-media-caption">
              {video.title && <span className="route-media-caption-title">{video.title}</span>}
              {video.duration && <span className="route-media-caption-duration">{video.duration}</span>}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export default RouteMediaGrid
