import PageMetadata from './PageMetadata.jsx'

function RoutePlaceholder({ title, paramName, value }) {
  return (
    <section className="page-placeholder">
      <PageMetadata noindex noindexTitle="Offward" />
      <p className="eyebrow">OFFWARD</p>
      <h1>{title}</h1>
      {value && <p>{paramName}: {value}</p>}
    </section>
  )
}

export default RoutePlaceholder