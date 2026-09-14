function ExploreCategoryNav({ activeView, onViewChange }) {
  return (
    <div className="explore-category-nav" role="tablist" aria-label="Explore category">
      <button
        type="button"
        role="tab"
        aria-selected={activeView === 'routes'}
        className={activeView === 'routes' ? 'explore-category-button is-active' : 'explore-category-button'}
        onClick={() => onViewChange('routes')}
      >
        Routes
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeView === 'places'}
        className={activeView === 'places' ? 'explore-category-button is-active' : 'explore-category-button'}
        onClick={() => onViewChange('places')}
      >
        Places
      </button>
    </div>
  )
}

export default ExploreCategoryNav
