import { Link, Outlet } from 'react-router-dom'

function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">OFFWARD</Link>
        <nav aria-label="Primary navigation">
          <Link to="/explore">Explore</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </header>
      <main><Outlet /></main>
    </div>
  )
}

export default AppShell