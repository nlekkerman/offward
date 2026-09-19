import { Link, useOutletContext } from 'react-router-dom'

const cards = [
  { label: 'Countries', href: '/manage/countries' },
  { label: 'Places', href: '/manage/places' },
  { label: 'Routes', href: '/manage/routes' },
  { label: 'Stories', href: '/manage/stories' },
  { label: 'Galleries', href: '/manage/galleries' },
  { label: 'Videos', href: '/manage/videos' },
  { label: 'Tours', href: '/manage/tours' },
  { label: 'Events', href: '/manage/events' },
  { label: 'Partners', href: '/manage/partners' },
]

function ManageDashboardPage() {
  const { onLogout } = useOutletContext()

  return (
    <section className="management-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Management</h1>
        </div>
        <button type="button" className="secondary-button" onClick={onLogout}>Logout</button>
      </div>
      <div className="management-dashboard-grid">
        {cards.map((item) => (
          <Link key={item.href} to={item.href} className="management-dashboard-card">
            <span>{item.label}</span>
            <strong>Open</strong>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default ManageDashboardPage
