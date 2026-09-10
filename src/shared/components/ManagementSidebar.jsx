import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', to: '/manage' },
  { label: 'Countries', to: '/manage/countries' },
  { label: 'Places', to: '/manage/places' },
  { label: 'Routes', to: '/manage/routes' },
  { label: 'Stories', to: '/manage/stories' },
  { label: 'Videos', to: '/manage/videos' },
  { label: 'Tours', to: '/manage/tours' },
  { label: 'Events', to: '/manage/events' },
  { label: 'Partners', to: '/manage/partners' },
]

function ManagementSidebar({ onLogout }) {
  return (
    <aside className="management-sidebar">
      <div className="management-brand-wrap">
        <div className="management-brand">OFFWARD</div>
        <div className="management-brand-subtitle">Management</div>
      </div>

      <nav className="management-nav" aria-label="Management navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/manage'}
            className={({ isActive }) => `management-nav-link ${isActive ? 'is-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}

        <button type="button" className="management-logout" onClick={onLogout}>
          Logout
        </button>
      </nav>
    </aside>
  )
}

export default ManagementSidebar
