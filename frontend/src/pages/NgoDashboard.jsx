import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getClaims, updateClaim } from '../services/claimService'
import { getNotifications } from '../services/notificationService'

const statusColor = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PICKED_UP: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function NgoDashboard() {
  const [claims, setClaims] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [claimsRes, notifRes] = await Promise.all([getClaims(), getNotifications()])
      setClaims(claimsRes.data)
      setNotifications(notifRes.data)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handlePickup = async (claimId) => {
    try {
      await updateClaim(claimId, 'PICKED_UP')
      toast.success('Pickup confirmed!')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  const handleCancel = async (claimId) => {
    try {
      await updateClaim(claimId, 'CANCELLED')
      toast.success('Claim cancelled')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel')
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">NGO Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claims */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">My Claims</h2>
          {claims.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">No claims yet.</div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <div key={claim.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Claim #{claim.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">Food Post: {claim.foodPostId.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400">{new Date(claim.claimedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[claim.status]}`}>
                      {claim.status}
                    </span>
                    {claim.status === 'APPROVED' && (
                      <button onClick={() => handlePickup(claim.id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                        Picked Up
                      </button>
                    )}
                    {(claim.status === 'PENDING' || claim.status === 'APPROVED') && (
                      <button onClick={() => handleCancel(claim.id)}
                        className="text-xs border border-red-400 text-red-500 px-2 py-1 rounded hover:bg-red-50">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Notifications</h2>
          {notifications.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">No notifications.</div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 10).map((n) => (
                <div key={n.id} className="bg-white rounded-lg shadow-sm p-3">
                  <p className="text-xs font-medium text-green-700">{n.type}</p>
                  <p className="text-sm text-gray-700">{n.message}</p>
                  <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
