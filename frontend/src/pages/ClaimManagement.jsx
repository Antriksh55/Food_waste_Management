import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getClaims, updateClaim } from '../services/claimService'
import { useAuth } from '../context/AuthContext'

const statusColor = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PICKED_UP: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function ClaimManagement() {
  const { user } = useAuth()
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const res = await getClaims()
      setClaims(res.data)
    } catch {
      toast.error('Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClaims() }, [])

  const handleAction = async (claimId, status) => {
    try {
      await updateClaim(claimId, status)
      toast.success(`Claim ${status.toLowerCase()}`)
      fetchClaims()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Claim Management</h1>
      {claims.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No claims found.</div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Claim #{claim.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500">Food Post: {claim.foodPostId.slice(0, 8)}</p>
                <p className="text-xs text-gray-400">{new Date(claim.claimedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[claim.status]}`}>
                  {claim.status}
                </span>
                {user?.role === 'RESTAURANT' && claim.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleAction(claim.id, 'APPROVED')}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={() => handleAction(claim.id, 'CANCELLED')}
                      className="text-xs border border-red-400 text-red-500 px-3 py-1 rounded hover:bg-red-50">
                      Cancel
                    </button>
                  </>
                )}
                {user?.role === 'NGO' && claim.status === 'APPROVED' && (
                  <button onClick={() => handleAction(claim.id, 'PICKED_UP')}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                    Mark Picked Up
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
