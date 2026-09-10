import { useParams } from 'react-router-dom'
import RoutePlaceholder from '../shared/components/RoutePlaceholder.jsx'

function EventPage() {
  const { eventSlug } = useParams()
  return <RoutePlaceholder title="Event" paramName="event" value={eventSlug} />
}

export default EventPage