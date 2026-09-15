import { Outlet, useNavigate } from 'react-router-dom'
import { logoutSession } from '../../services/authApi.js'

function ManageLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logoutSession()
    } catch {
      // no-op: the route guard will reset the auth state on next refresh
    }
    navigate('/manage/login', { replace: true })
  }

  return (
    <div className="management-shell">
      <main className="management-content">
        <Outlet context={{ onLogout: handleLogout }} />
      </main>
    </div>
  )
}

export default ManageLayout
