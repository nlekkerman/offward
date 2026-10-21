import { Link, useLocation } from 'react-router-dom'
import './HomePage.css'

const HOME_NAV_LINKS = [
  { section: 'home', label: 'Home', to: '/', icon: 'M3 10.5 12 3l9 7.5M5 9v12h14V9M9 21v-7h6v7' },
  { section: 'explore', label: 'Explore', to: '/explore', icon: 'M12 3v2m0 14v2M3 12h2m14 0h2m-2.64-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64M15.5 8.5l-5 2-2 5 5-2 2-5Z' },
  { section: 'routes', label: 'Routes', to: '/explore?view=routes', icon: 'M4 19c4 0 4-6 8-6s4 6 8 6M4 5c4 0 4 6 8 6s4-6 8-6M4 5v14m16-14v14' },
  { section: 'places', label: 'Places', to: '/explore?view=places', icon: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
  { section: 'stories', label: 'Stories', to: '/stories', icon: 'M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 1 5 17.5v-13ZM5 17.5A2.5 2.5 0 0 1 7.5 15H20M9 6h7m-7 4h7' },
  { section: 'food', label: 'Food', to: '/food', icon: 'M7 3v7m-3-7v4a3 3 0 0 0 6 0V3M7 10v11m10-18v18m0-18c3 2 4 5 4 8h-4' },
  { section: 'countries', label: 'Countries', to: '/countries', icon: 'M3 5h18v14H3zM3 10h18M8 5v5m8-5v5m-8 9v-5m8 5v-5' },
  { section: 'about', label: 'About', to: '/about', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14h.01M11 12h1v5h1' },
  { section: 'contact', label: 'Contact', to: '/contact', icon: 'M3 5h18v14H3zM3 6l9 7 9-7' },
]

function HomeNavigationRibbon({ activeSection }) {
  const { pathname, search } = useLocation()
  const params = new URLSearchParams(search)

  return (
    <nav className="home-navigation-ribbon" aria-label="Primary navigation">
      {HOME_NAV_LINKS.map(({ section, label, to, icon }) => {
        const isActive = section === 'explore'
          ? pathname === '/explore' && !params.has('view')
          : activeSection === section && (section !== 'routes' || pathname !== '/explore' || params.get('view') === 'routes')

        return (
          <Link
            className={`home-navigation-link${isActive ? ' is-active' : ''}`}
            key={section}
            to={to}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            title={label}
            data-tooltip={label}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d={icon} />
            </svg>
            <span className="home-navigation-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default HomeNavigationRibbon
