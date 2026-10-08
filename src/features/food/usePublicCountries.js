import { useEffect, useSyncExternalStore } from 'react'
import { getPublicCountriesPage } from '../../services/countriesApi.js'
import { createPublicRelationshipCatalog } from './publicFoodCacheState.js'

const catalog = createPublicRelationshipCatalog((page) => getPublicCountriesPage({ page }))

export default function usePublicCountries() {
  const result = useSyncExternalStore(catalog.subscribe, catalog.getSnapshot, catalog.getSnapshot)
  useEffect(() => {
    if (result.status === 'idle') {
      catalog.loadNext().catch(() => {
        // Catalog failure is exposed through its subscribed error state.
      })
    }
  }, [result.status])
  const loadMore = () => catalog.loadNext().catch(() => {
    // Preserve loaded countries; the subscribed state displays the failure.
  })
  return { countries: result.records, status: result.status, next: result.next, retry: loadMore, loadMore }
}
