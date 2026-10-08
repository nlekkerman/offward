import { orderedRows } from './foodForm.js'
import './foodManagement.css'

function FoodRecipeEditor({ ingredients = [], steps = [], onChange, errors = {}, disabled = false }) {
  function update(field, rows, index, key, value) {
    onChange(field, rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row))
  }

  function move(field, rows, index, offset) {
    const next = [...rows]
    const target = index + offset
    if (target < 0 || target >= rows.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(field, orderedRows(next))
  }

  function renderRows(field, rows, fields, emptyRow) {
    const singular = field === 'ingredients' ? 'ingredient' : 'step'
    return (
      <section className="food-recipe-editor" aria-label={field}>
        <h3>{field === 'ingredients' ? 'Ingredients' : 'Steps'}</h3>
        {errors[field] && <p className="field-error-text" role="alert">{errors[field]}</p>}
        {!rows.length && <p>No {field} added.</p>}
        {rows.map((row, index) => (
          <fieldset className="food-recipe-row" key={index} disabled={disabled}>
            <legend>{singular === 'ingredient' ? 'Ingredient' : 'Step'} {index + 1}</legend>
            {fields.map((key) => {
              const id = `food-${field}-${index}-${key}`
              const error = errors[`${field}.${index}.${key}`]
              const props = { id, value: row[key] || '', onChange: (event) => update(field, rows, index, key, event.target.value), required: key === 'name' || key === 'text', className: error ? 'form-input field-error' : 'form-input', 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined }
              return <div className="form-field" key={key}><label htmlFor={id}>{key[0].toUpperCase() + key.slice(1)}</label>{key === 'text' || key === 'note' ? <textarea {...props} rows={key === 'text' ? 4 : 2} /> : <input {...props} type="text" />}{error && <span className="field-error-text" id={`${id}-error`}>{error}</span>}</div>
            })}
            {errors[`${field}.${index}.non_field_errors`] && <p className="field-error-text" role="alert">{errors[`${field}.${index}.non_field_errors`]}</p>}
            <div className="food-recipe-actions">
              <button type="button" className="secondary-button small-button" disabled={disabled || index === 0} onClick={() => move(field, rows, index, -1)} aria-label={`Move ${singular} ${index + 1} up`}>Up</button>
              <button type="button" className="secondary-button small-button" disabled={disabled || index === rows.length - 1} onClick={() => move(field, rows, index, 1)} aria-label={`Move ${singular} ${index + 1} down`}>Down</button>
              <button type="button" className="danger-button small-button" onClick={() => onChange(field, orderedRows(rows.filter((_, rowIndex) => rowIndex !== index)))} aria-label={`Remove ${singular} ${index + 1}`}>Remove</button>
            </div>
          </fieldset>
        ))}
        <button type="button" className="secondary-button small-button" disabled={disabled} onClick={() => onChange(field, orderedRows([...rows, { ...emptyRow }]))}>Add {singular}</button>
      </section>
    )
  }

  return <>{renderRows('ingredients', ingredients, ['name', 'quantity', 'note'], { name: '', quantity: '', note: '' })}{renderRows('steps', steps, ['text'], { text: '' })}</>
}

export default FoodRecipeEditor
