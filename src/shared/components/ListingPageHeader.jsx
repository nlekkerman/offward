function ListingPageHeader({ eyebrow, title, aside }) {
  return (
    <header className="listing-page-header">
      <div className="listing-page-header-copy">
        <p className="listing-page-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {aside && <div className="listing-page-header-aside">{aside}</div>}
    </header>
  )
}

export default ListingPageHeader
