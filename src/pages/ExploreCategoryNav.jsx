function ExploreCategoryNav({ activeView, onViewChange }) {
  return (
    <div className="explore-category-nav" role="group" aria-label="Explore category">
      <button
        type="button"
        aria-pressed={activeView === 'routes'}
        className={activeView === 'routes' ? 'explore-category-button is-active' : 'explore-category-button'}
        onClick={() => onViewChange('routes')}
      >
        Routes
      </button>
      <button
        type="button"
        aria-pressed={activeView === 'places'}
        className={activeView === 'places' ? 'explore-category-button is-active' : 'explore-category-button'}
        onClick={() => onViewChange('places')}
      >
        Places
      </button>
    </div>
  )
}

export default ExploreCategoryNav
