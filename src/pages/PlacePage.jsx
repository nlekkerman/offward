import { useParams } from 'react-router-dom'
import RoutePlaceholder from '../shared/components/RoutePlaceholder.jsx'

function PlacePage() {
  const { placeSlug } = useParams()
  return <RoutePlaceholder title="Place" paramName="place" value={placeSlug} />
}

export default PlacePage