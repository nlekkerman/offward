import { imageId, imagePreviewUrl } from './imageCollectionUtils.js'

// The map placement is intentionally not offered: no existing entity-level map
// card renders Stories, Places, Food or Routes (the route-map overlay shows
// waypoint/segment details only).
export const CARD_IMAGE_PLACEMENTS = [
  { key: 'standard', label: 'Standard Card' },
  { key: 'homepage', label: 'Homepage Card' },
  { key: 'related', label: 'Related Card' },
]

const PLACEMENT_KEYS = ['standard', 'homepage', 'related', 'map']

// Normalizes management readback (ImageAsset UUID strings, explicit nulls, or
// defensively nested objects) into `{ placement: uuid-string | null }` while
// preserving explicit nulls and dropping unknown keys. Missing keys stay missing.
export function normalizeCardImageSelections(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const next = {}
  PLACEMENT_KEYS.forEach((key) => {
    if (!Object.hasOwn(value, key)) return
    const selection = value[key]
    if (selection === null) next[key] = null
    else if (typeof selection === 'string' && selection) next[key] = selection
    else if (selection && typeof selection === 'object' && selection.id) next[key] = String(selection.id)
  })
  return next
}

function selectedAssetId(selection) {
  if (typeof selection === 'string') return selection
  if (selection && typeof selection === 'object' && selection.id) return String(selection.id)
  return ''
}

function CardImageSelectionSection({ images = [], selections = {}, onSelectionsChange, disabled = false, idPrefix = 'card-image' }) {
  if (!onSelectionsChange) return null

  const setSelection = (placement, value) => {
    onSelectionsChange({ ...normalizeCardImageSelections(selections), [placement]: value })
  }

  return (
    <div className="content-image-hero card-image-selection-section">
      <p className="eyebrow">Card images</p>
      {CARD_IMAGE_PLACEMENTS.map(({ key, label }) => {
        const selected = selectedAssetId(selections?.[key])
        const selectedVisible = Boolean(selected) && images.some((image) => imageId(image) === selected)
        return (
          <div key={key} className="card-image-placement">
            <strong>{label}</strong>
            <label className="checkbox-item">
              <input
                type="radio"
                name={`${idPrefix}-${key}`}
                checked={!selected}
                onChange={() => setSelection(key, null)}
                disabled={disabled}
              />
              Automatic
            </label>
            {images.length === 0 && <p className="content-image-empty">Attach a gallery with images to choose a card image.</p>}
            {images.length > 0 && (
              <div className="content-image-picker card-image-placement-picker" aria-label={`${label} image options`}>
                {images.map((image, index) => {
                  const assetId = imageId(image)
                  const isSelected = Boolean(assetId) && selected === assetId
                  return (
                    <button
                      type="button"
                      key={`${assetId || 'image'}-${index}`}
                      className={isSelected ? 'content-image-picker-card is-selected' : 'content-image-picker-card'}
                      onClick={() => setSelection(key, assetId)}
                      disabled={disabled || !assetId}
                      aria-pressed={isSelected}
                    >
                      <span className="content-image-picker-preview">
                        {imagePreviewUrl(image) ? <img src={imagePreviewUrl(image)} alt="" loading="lazy" /> : <span>Image</span>}
                      </span>
                      <span>{isSelected ? '✓ Selected' : `Image ${index + 1}`}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {Boolean(selected) && !selectedVisible && (
              <p className="content-image-status">The saved selection is not in the attached galleries. It is kept until you choose another option.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default CardImageSelectionSection
