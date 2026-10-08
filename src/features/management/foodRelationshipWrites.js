export const FOOD_RELATIONSHIP_FIELDS = ['place_ids', 'route_ids', 'story_ids', 'waypoint_ids', 'segment_ids']

function normalizeIds(value) {
  return value
    .map((item) => (item && typeof item === 'object' ? item.id : item))
    .filter((id) => id !== null && id !== undefined && id !== '')
    .map(String)
}

export async function updateFoodRelationship(foodsApi, foodId, field, ownerId, attach) {
  if (!FOOD_RELATIONSHIP_FIELDS.includes(field)) {
    throw new Error(`Unsupported Food relationship field: ${field}`)
  }

  const food = await foodsApi.getById(foodId)
  if (!Array.isArray(food?.[field])) {
    throw new Error(`Food ${foodId} has no readable ${field} relationship array; no changes were made.`)
  }

  const currentIds = normalizeIds(food[field])
  const ownerIdString = String(ownerId)
  const nextIds = attach
    ? [...new Set([...currentIds, ownerIdString])]
    : currentIds.filter((id) => id !== ownerIdString)

  await foodsApi.update(foodId, { [field]: nextIds })
  return nextIds
}
