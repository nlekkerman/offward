import { createManagementEntityApi } from './entityApi.js'

export const countriesApi = createManagementEntityApi('countries')
export const placesApi = createManagementEntityApi('places')
export const routesApi = createManagementEntityApi('routes')
export const storiesApi = createManagementEntityApi('stories')
export const videosApi = createManagementEntityApi('videos')
export const toursApi = createManagementEntityApi('tours')
export const eventsApi = createManagementEntityApi('events')
export const partnersApi = createManagementEntityApi('partners')

export const managementApis = {
  countries: countriesApi,
  places: placesApi,
  routes: routesApi,
  stories: storiesApi,
  videos: videosApi,
  tours: toursApi,
  events: eventsApi,
  partners: partnersApi,
}
