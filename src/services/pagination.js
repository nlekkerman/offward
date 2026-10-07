export function normalizePaginatedResponse(data, resourceName) {
  if (
    !data
    || typeof data !== 'object'
    || !Number.isFinite(data.count)
    || !Array.isArray(data.results)
    || !(data.next === null || typeof data.next === 'string')
    || !(data.previous === null || typeof data.previous === 'string')
  ) {
    throw new Error(`${resourceName} response must be a paginated object.`)
  }

  return {
    count: data.count,
    next: data.next,
    previous: data.previous,
    results: data.results,
  }
}
