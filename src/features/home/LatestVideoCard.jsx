import VideoPlayer from '../video/VideoPlayer.jsx'
import { formatPublishedDate } from './latestContentFormatting.js'

function LatestVideoCard({ video }) {
  const publishedLabel = formatPublishedDate(video.published_at)

  return (
    <article className="latest-rail-card latest-rail-card-video" aria-label="Latest video">
      <VideoPlayer
        playbackUrl={video.playback_url}
        thumbnailUrl={video.thumbnail_url || video.thumbnail}
        title={video.title}
      />
      <p className="latest-rail-type">Video</p>
      <h3 className="latest-rail-title">{video.title}</h3>
      {publishedLabel && <p className="latest-rail-meta-row"><span>{publishedLabel}</span></p>}
    </article>
  )
}

export default LatestVideoCard
