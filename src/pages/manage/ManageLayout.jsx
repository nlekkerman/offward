import { Outlet, useNavigate } from 'react-router-dom'
import ManagementSidebar from '../../shared/components/ManagementSidebar.jsx'
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
    <div className="management-layout">
      <ManagementSidebar onLogout={handleLogout} />
      <main className="management-content">
        <Outlet />
      </main>
    </div>
  )
}

export default ManageLayout
