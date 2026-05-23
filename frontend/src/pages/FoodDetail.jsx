import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getFoodById, deleteFood } from '../services/foodService'
import { createClaim } from '../services/claimService'
import { useAuth } from '../context/AuthContext'

export default function FoodDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [food, setFood] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFoodById(id)
      .then((res) => setFood(res.data))
      .catch(() => toast.error('Food post not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleClaim = async () => {
    try {
      await createClaim(id)
      toast.success('Claimed successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this food post?')) return
    try {
      await deleteFood(id)
      toast.success('Food post deleted')
      navigate('/restaurant/dashboard')
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>
  if (!food) return <div className="text-center py-20 text-gray-400">Not found</div>

  const statusColor = { AVAILABLE: 'bg-green-100 text-green-700', CLAIMED: 'bg-yellow-100 text-yellow-700', EXPIRED: 'bg-red-100 text-red-700' }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {food.imageUrl && (
          <img src={food.imageUrl} alt={food.title} className="w-full h-56 object-cover" />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">{food.title}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor[food.status]}`}>
              {food.status}
            </span>
          </div>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <p><span className="font-medium">Type:</span> {food.foodType}</p>
            <p><span className="font-medium">Quantity:</span> {food.quantity}</p>
            <p><span className="font-medium">Pickup Address:</span> {food.pickupAddress}</p>
            <p><span className="font-medium">Expires:</span> {new Date(food.expiryTime).toLocaleString()}</p>
            {food.contactDetails && <p><span className="font-medium">Contact:</span> {food.contactDetails}</p>}
            {food.status === 'CLAIMED' && food.claimedByName && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-2">
                <span className="text-yellow-600">🤝</span>
                <p className="text-yellow-800 font-medium">
                  Claimed by <span className="font-semibold">{food.claimedByName}</span>
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {user?.role === 'NGO' && food.status === 'AVAILABLE' && (
              <button onClick={handleClaim}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700">
                Claim This Food
              </button>
            )}
            {user?.role === 'RESTAURANT' && user.id === food.restaurantId && (
              <>
                <button onClick={() => navigate(`/foods/${id}/edit`)}
                  className="flex-1 border border-green-600 text-green-600 py-2 rounded-lg font-semibold hover:bg-green-50">
                  Edit
                </button>
                <button onClick={handleDelete}
                  className="flex-1 border border-red-500 text-red-500 py-2 rounded-lg font-semibold hover:bg-red-50">
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
