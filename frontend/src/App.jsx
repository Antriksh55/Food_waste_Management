import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import FoodListing from './pages/FoodListing'
import FoodDetail from './pages/FoodDetail'
import RestaurantDashboard from './pages/RestaurantDashboard'
import NgoDashboard from './pages/NgoDashboard'
import ClaimManagement from './pages/ClaimManagement'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Navbar />
        <main className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/foods" element={<FoodListing />} />
            <Route path="/foods/:id" element={<FoodDetail />} />
            <Route path="/restaurant/dashboard" element={
              <ProtectedRoute><RoleRoute allowedRoles={['RESTAURANT']}><RestaurantDashboard /></RoleRoute></ProtectedRoute>
            } />
            <Route path="/ngo/dashboard" element={
              <ProtectedRoute><RoleRoute allowedRoles={['NGO']}><NgoDashboard /></RoleRoute></ProtectedRoute>
            } />
            <Route path="/claims" element={
              <ProtectedRoute><ClaimManagement /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute><RoleRoute allowedRoles={['ADMIN']}><AdminDashboard /></RoleRoute></ProtectedRoute>
            } />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}
