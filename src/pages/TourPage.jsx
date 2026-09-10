import { useParams } from 'react-router-dom'
import RoutePlaceholder from '../shared/components/RoutePlaceholder.jsx'

function TourPage() {
  const { tourSlug } = useParams()
  return <RoutePlaceholder title="Tour" paramName="tour" value={tourSlug} />
}

export default TourPage