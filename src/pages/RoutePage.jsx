import { useParams } from 'react-router-dom'
import RoutePlaceholder from '../shared/components/RoutePlaceholder.jsx'

function RoutePage() {
  const { routeSlug } = useParams()
  return <RoutePlaceholder title="Route" paramName="route" value={routeSlug} />
}

export default RoutePage