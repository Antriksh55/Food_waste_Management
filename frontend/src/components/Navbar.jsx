import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const dashboardLink = user?.role === 'RESTAURANT'
    ? '/restaurant/dashboard'
    : user?.role === 'NGO'
    ? '/ngo/dashboard'
    : user?.role === 'ADMIN'
    ? '/admin'
    : null

  return (
    <nav className="bg-green-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">🌱 FoodShare</Link>
          <div className="flex items-center gap-4">
            <Link to="/foods" className="hover:text-green-200 text-sm">Browse Food</Link>
            {user ? (
              <>
                {dashboardLink && (
                  <Link to={dashboardLink} className="hover:text-green-200 text-sm">Dashboard</Link>
                )}
                <span className="text-green-200 text-sm">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-white text-green-600 px-3 py-1 rounded text-sm font-medium hover:bg-green-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-green-200 text-sm">Login</Link>
                <Link to="/register" className="bg-white text-green-600 px-3 py-1 rounded text-sm font-medium hover:bg-green-50">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
