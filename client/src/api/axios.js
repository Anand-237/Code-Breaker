import axios from 'axios'

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (!envUrl) return '/api'
  const trimmed = envUrl.replace(/\/$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every request
api.interceptors.request.use((config) => {
  let token = null
  try {
    token = sessionStorage.getItem('cb_token') || localStorage.getItem('cb_token')
  } catch (_) {}
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — but NOT on the login endpoint itself,
// otherwise a wrong-password response would redirect instead of showing an error.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      try {
        sessionStorage.removeItem('cb_token')
        localStorage.removeItem('cb_token')
      } catch (_) {}
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
