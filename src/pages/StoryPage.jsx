import { useParams } from 'react-router-dom'
import RoutePlaceholder from '../shared/components/RoutePlaceholder.jsx'

function StoryPage() {
  const { storySlug } = useParams()
  return <RoutePlaceholder title="Story" paramName="story" value={storySlug} />
}

export default StoryPage