import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/admin/round-control', label: 'Round Control', icon: '' },
  { to: '/admin/users', label: 'Participants', icon: '' },
  { to: '/admin/questions', label: 'Question Bank', icon: '' },
  { to: '/admin/results', label: 'Results & Export', icon: '' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
            
            <span className="display-title" style={{ fontSize:'0.75rem', letterSpacing:'0.15em', color:'var(--red-bright)' }}>
              CODE BREAKERS
            </span>
          </div>
          <p style={{ fontFamily:'var(--font-heading)', fontSize:'0.62rem', letterSpacing:'0.2em', color:'var(--text-dim)', textTransform:'uppercase' }}>
            Admin Command
          </p>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop:'auto', padding:'16px 20px', borderTop:'1px solid var(--border-subtle)' }}>
          <p style={{ fontFamily:'var(--font-body)', fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'4px' }}>{user?.name}</p>
          <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'12px' }}>{user?.username}</p>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ width:'100%' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}
