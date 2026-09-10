function RoutePlaceholder({ title, paramName, value }) {
  return (
    <section className="page-placeholder">
      <p className="eyebrow">OFFWARD</p>
      <h1>{title}</h1>
      {value && <p>{paramName}: {value}</p>}
    </section>
  )
}

export default RoutePlaceholder