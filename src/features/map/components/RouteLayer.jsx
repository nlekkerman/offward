import { GeoJSON } from 'react-leaflet'
import { ROUTE_LINE_STYLE, EXPLORE_ROUTE_STYLE, EXPLORE_SELECTED_ROUTE_STYLE } from '../mapStyles.js'

// Renders Route GeoJSON lines with click selection and selected/unselected presentation.
function RouteLayer({ routes, selectedRouteId, onRouteSelect, routeLineStyle }) {
  return routes.map((route) => {
    const key = route.id ?? route.slug
    const geoJsonData = {
      type: 'Feature',
      geometry: route.geometry,
      properties: {
        id: route.id,
        slug: route.slug,
        title: route.title,
      },
    }
    const style = onRouteSelect
      ? (route.id === selectedRouteId ? EXPLORE_SELECTED_ROUTE_STYLE : EXPLORE_ROUTE_STYLE)
      : routeLineStyle || ROUTE_LINE_STYLE

    return (
      <GeoJSON
        key={key}
        data={geoJsonData}
        style={style}
        eventHandlers={onRouteSelect ? { click: () => onRouteSelect(route.id) } : undefined}
      />
    )
  })
}

export default RouteLayer
