import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && !url.startsWith('/auth')) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(err)
  }
)

export default api
