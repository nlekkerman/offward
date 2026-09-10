import { useParams } from 'react-router-dom'
import RoutePlaceholder from '../shared/components/RoutePlaceholder.jsx'

function VideoPage() {
  const { videoSlug } = useParams()
  return <RoutePlaceholder title="Video" paramName="video" value={videoSlug} />
}

export default VideoPage