import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) {
    const redirectMap = { RESTAURANT: '/restaurant/dashboard', NGO: '/ngo/dashboard', ADMIN: '/admin' }
    return <Navigate to={redirectMap[user.role] || '/'} replace />
  }
  return children
}
