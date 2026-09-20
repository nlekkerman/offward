import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { getOffwardAccess } from '../../services/authApi.js'

const NAV_LINKS = [
  { section: 'stories', label: 'Stories', to: '/stories' },
  { section: 'places', label: 'Places', to: '/explore?view=places' },
  { section: 'routes', label: 'Routes', to: '/explore?view=routes' },
  { section: 'countries', label: 'Countries', to: '/countries' },
  { section: 'about', label: 'About', to: '/about' },
  { section: 'contact', label: 'Contact', to: '/contact' },
]

function getActiveSection(pathname, search) {
  if (pathname.startsWith('/stories')) return 'stories'
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
  const { pathname, search } = useLocation()
  const activeSection = getActiveSection(pathname, search)
  // Mirrors ManagementGuard's own check; null until resolved to avoid a management-link flash.
  const [canManageOffward, setCanManageOffward] = useState(null)

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
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">OFFWARD</Link>
        <nav aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.section}
              to={link.to}
              className={link.section === activeSection ? 'is-active' : undefined}
              aria-current={link.section === activeSection ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          {canManageOffward === true && (
            <Link
              to="/manage"
              className={activeSection === 'manage' ? 'is-active' : undefined}
              aria-current={activeSection === 'manage' ? 'page' : undefined}
            >
              Management
            </Link>
          )}
        </nav>
      </header>
      <main><Outlet /></main>
    </div>
  )
}

export default AppShell