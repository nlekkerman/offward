import { useMemo, useState } from 'react'

function defaultGetId(item) {
  return item?.id
}

function defaultGetLabel(item) {
  return item?.name || item?.title || item?.slug || String(item?.id ?? '')
}

/**
 * Compact "attached rows + searchable add picker" UI for a single relationship,
 * used in place of permanently rendering every option as a checkbox.
 */
function RelationshipAttachmentManager({
  title,
  attachedIds = [],
  availableItems = [],
  getId = defaultGetId,
  getLabel = defaultGetLabel,
  getSecondaryLabel,
  searchPlaceholder = 'Search…',
  onAttach,
  onDetach,
  emptyText = 'None attached yet.',
  disabled = false,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const attachedIdSet = useMemo(
    () => new Set(attachedIds.map((value) => String(value))),
    [attachedIds],
  )

  const itemsById = useMemo(() => {
    const map = new Map()
    availableItems.forEach((item) => map.set(String(getId(item)), item))
    return map
  }, [availableItems, getId])

  const attachedItems = attachedIds.map((attachedId) => {
    const item = itemsById.get(String(attachedId))
    return item || { id: attachedId, __unresolved: true }
  })

  const searchValue = search.trim().toLowerCase()
  const pickerItems = availableItems.filter((item) => {
    if (attachedIdSet.has(String(getId(item)))) return false
    if (!searchValue) return true
    return getLabel(item).toLowerCase().includes(searchValue)
  })

  return (
    <div className="relationship-attachment-manager">
      <div className="relationship-attachment-header">
        <div>
          <p className="eyebrow">{title}</p>
        </div>
        <button
          type="button"
          className="secondary-button small-button"
          onClick={() => setIsPickerOpen((open) => !open)}
          disabled={disabled}
          aria-expanded={isPickerOpen}
        >
          {isPickerOpen ? 'Close picker' : `+ Add ${title.toLowerCase()}`}
        </button>
      </div>

      {!attachedItems.length && <p className="content-image-empty">{emptyText}</p>}

      {attachedItems.length > 0 && (
        <ul className="relationship-attachment-list">
          {attachedItems.map((item) => {
            const id = getId(item) ?? item.id
            const secondary = !item.__unresolved && getSecondaryLabel ? getSecondaryLabel(item) : ''
            return (
              <li key={id} className="relationship-attachment-row">
                <span className="relationship-attachment-label">
                  {item.__unresolved ? String(id) : getLabel(item)}
                  {secondary && <span className="relationship-attachment-secondary"> · {secondary}</span>}
                </span>
                <button
                  type="button"
                  className="danger-button small-button"
                  onClick={() => onDetach?.(id)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isPickerOpen && (
        <div className="relationship-attachment-picker">
          <input
            type="text"
            className="form-input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={disabled}
          />
          {!pickerItems.length && <p className="content-image-empty">No matching items.</p>}
          {pickerItems.length > 0 && (
            <ul className="relationship-attachment-picker-list">
              {pickerItems.map((item) => {
                const id = getId(item)
                const secondary = getSecondaryLabel ? getSecondaryLabel(item) : ''
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="relationship-attachment-picker-item"
                      onClick={() => onAttach?.(id)}
                      disabled={disabled}
                    >
                      {getLabel(item)}
                      {secondary && <span className="relationship-attachment-secondary"> · {secondary}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default RelationshipAttachmentManager
