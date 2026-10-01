import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import Round1Page from './pages/Round1Page'
import Round2Page from './pages/Round2Page'
import Round3Page from './pages/Round3Page'
import FinalResultPage from './pages/FinalResultPage'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminUsers from './pages/admin/AdminUsers'
import AdminQuestions from './pages/admin/AdminQuestions'
import AdminRoundControl from './pages/admin/AdminRoundControl'
import AdminResults from './pages/admin/AdminResults'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const LoadingScreen = () => (
  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:'20px' }}>
    <div className="spinner" />
    <p style={{ fontFamily:'var(--font-heading)',letterSpacing:'0.2em',color:'var(--text-dim)',fontSize:'0.8rem' }}>
      INITIALIZING...
    </p>
  </div>
)

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
    <Route path="/round/1" element={<ProtectedRoute><Round1Page /></ProtectedRoute>} />
    <Route path="/round/2" element={<ProtectedRoute><Round2Page /></ProtectedRoute>} />
    <Route path="/round/3" element={<ProtectedRoute><Round3Page /></ProtectedRoute>} />
    <Route path="/final-result" element={<ProtectedRoute><FinalResultPage /></ProtectedRoute>} />

    <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
      <Route index element={<Navigate to="/admin/round-control" replace />} />
      <Route path="round-control" element={<AdminRoundControl />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="questions" element={<AdminQuestions />} />
      <Route path="results" element={<AdminResults />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
