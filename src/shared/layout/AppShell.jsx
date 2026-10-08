import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { getOffwardAccess } from '../../services/authApi.js'
import desktopLogo from '../../assets/images/home/logo_offward.webp'
import mobileLogo from '../../assets/images/home/logo_arrow_only.webp'

const NAV_LINKS = [
  { section: 'home', label: 'Home', to: '/' },
  { section: 'stories', label: 'Stories', to: '/stories' },
  { section: 'food', label: 'Food', to: '/food' },
  { section: 'places', label: 'Places', to: '/explore?view=places' },
  { section: 'routes', label: 'Routes', to: '/explore?view=routes' },
  { section: 'countries', label: 'Countries', to: '/countries' },
  { section: 'about', label: 'About', to: '/about' },
  { section: 'contact', label: 'Contact', to: '/contact' },
]

function getActiveSection(pathname, search) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/stories')) return 'stories'
  if (pathname.startsWith('/food')) return 'food'
  if (pathname.startsWith('/places')) return 'places'
  if (pathname.startsWith('/routes')) return 'routes'
  if (pathname.startsWith('/countries')) return 'countries'
  if (pathname.startsWith('/about')) return 'about'
  if (pathname.startsWith('/contact')) return 'contact'
  if (pathname.startsWith('/manage')) return 'manage'

  if (pathname === '/explore') {
    return new URLSearchParams(search).get('view') === 'places' ? 'places' : 'routes'
  }

  return null
}

function AppShell() {
  const { pathname, search, key: locationKey } = useLocation()
  const activeSection = getActiveSection(pathname, search)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  const [menuLocation, setMenuLocation] = useState(null)
  const isMenuOpen = isMobile && menuLocation === locationKey
  const headerRef = useRef(null)
  const menuButtonRef = useRef(null)
  const navRef = useRef(null)
  // Mirrors ManagementGuard's own check; null until resolved to avoid a management-link flash.
  const [canManageOffward, setCanManageOffward] = useState(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 600px)')
    function handleBreakpointChange(event) {
      setIsMobile(event.matches)
      setMenuLocation(null)
    }
    mediaQuery.addEventListener('change', handleBreakpointChange)
    return () => mediaQuery.removeEventListener('change', handleBreakpointChange)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return

    const previousOverflow = document.body.style.overflow
    const menuButton = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    navRef.current.querySelector('a')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuLocation(null)
      }
      if (event.key !== 'Tab') return

      const focusableElements = headerRef.current.querySelectorAll('a, button')
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const focusOutside = !headerRef.current.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === firstElement || focusOutside)) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && (document.activeElement === lastElement || focusOutside)) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    function handlePointerDown(event) {
      if (!headerRef.current.contains(event.target)) setMenuLocation(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
      if (menuButton?.isConnected && window.matchMedia('(max-width: 600px)').matches) {
        menuButton.focus()
      }
    }
  }, [isMenuOpen])

  useEffect(() => {
    let isMounted = true

    getOffwardAccess().then((result) => {
      if (isMounted) {
        setCanManageOffward(result.canManageOffward === true)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className={`app-shell${pathname === '/' ? ' app-shell-home' : ''}`}>
      <div className={`mobile-nav-backdrop${isMenuOpen ? ' is-open' : ''}`} aria-hidden="true" />
      <header ref={headerRef} className={`app-header${isMenuOpen ? ' mobile-menu-open' : ''}`}>
        <Link to="/" className="brand" aria-label="Offward home">
          <picture>
            <source media="(max-width: 600px)" srcSet={mobileLogo} />
            <img className="brand-logo" src={desktopLogo} alt="Offward" />
          </picture>
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          className="mobile-nav-toggle"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuLocation(isMenuOpen ? null : locationKey)}
        >
          <span className="mobile-nav-icon" aria-hidden="true"><span /><span /><span /></span>
        </button>
        <nav
          ref={navRef}
          id="primary-navigation"
          aria-label="Primary navigation"
          inert={isMobile && !isMenuOpen}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.section}
              to={link.to}
              className={link.section === activeSection ? 'is-active' : undefined}
              aria-current={link.section === activeSection ? 'page' : undefined}
              onClick={() => setMenuLocation(null)}
            >
              {link.label}
            </Link>
          ))}
          {canManageOffward === true && (
            <Link
              to="/manage"
              className={activeSection === 'manage' ? 'is-active' : undefined}
              aria-current={activeSection === 'manage' ? 'page' : undefined}
              onClick={() => setMenuLocation(null)}
            >
              Management
            </Link>
          )}
        </nav>
      </header>
      <main inert={isMenuOpen}><Outlet /></main>
    </div>
  )
}

export default AppShell