function LocationPinFallback() {
  return (
    <span className="location-pin-fallback" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 21s-7-4.35-7-11a7 7 0 1 1 14 0c0 6.65-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.25" />
      </svg>
    </span>
  )
}

export default LocationPinFallback
