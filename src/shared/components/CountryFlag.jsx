import ReactCountryFlag from 'react-country-flag'

const FLAG_SIZES = {
  small: { width: '1.35rem', height: '0.9rem' },
  medium: { width: '2rem', height: '1.33rem' },
}

function CountryFlag({ code, countryName, size = 'small', className = '', decorative = false }) {
  const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : ''
  const isValidCode = /^[A-Z]{2}$/.test(normalizedCode)
  const dimensions = FLAG_SIZES[size] || FLAG_SIZES.small
  const accessibleLabel = countryName
    ? `${countryName} flag${isValidCode ? '' : ' unavailable'}`
    : isValidCode ? `${normalizedCode} country flag` : 'Country flag unavailable'

  return (
    <span
      className={`country-flag ${isValidCode ? '' : 'country-flag--fallback'} ${className}`.trim()}
      style={dimensions}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : accessibleLabel}
      aria-hidden={decorative || undefined}
    >
      {isValidCode && (
        <ReactCountryFlag
          countryCode={normalizedCode}
          svg
          aria-hidden="true"
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </span>
  )
}

export default CountryFlag