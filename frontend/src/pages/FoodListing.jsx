import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getFoods, searchFoods } from '../services/foodService'
import { createClaim } from '../services/claimService'
import { useAuth } from '../context/AuthContext'

export default function FoodListing() {
  const { user } = useAuth()
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ city: '', foodType: '', minQuantity: '' })

  const fetchFoods = async () => {
    setLoading(true)
    try {
      const hasFilter = filters.city || filters.foodType || filters.minQuantity
      const res = hasFilter
        ? await searchFoods({
            city: filters.city || undefined,
            foodType: filters.foodType || undefined,
            minQuantity: filters.minQuantity || undefined,
          })
        : await getFoods()
      setFoods(res.data.content || res.data)
    } catch {
      toast.error('Failed to load food listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFoods() }, [])

  const handleClaim = async (foodId) => {
    try {
      await createClaim(foodId)
      toast.success('Food claimed successfully!')
      fetchFoods()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim food')
    }
  }

  const statusColor = { AVAILABLE: 'bg-green-100 text-green-700', CLAIMED: 'bg-yellow-100 text-yellow-700', EXPIRED: 'bg-red-100 text-red-700' }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Available Food</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3">
        <input
          placeholder="City"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <input
          placeholder="Food type"
          value={filters.foodType}
          onChange={(e) => setFilters({ ...filters, foodType: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <input
          type="number"
          placeholder="Min quantity"
          value={filters.minQuantity}
          onChange={(e) => setFilters({ ...filters, minQuantity: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={fetchFoods}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Search
        </button>
        <button
          onClick={() => { setFilters({ city: '', foodType: '', minQuantity: '' }); fetchFoods() }}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : foods.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No food available matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {foods.map((food) => (
            <div key={food.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
              {food.imageUrl && (
                <img src={food.imageUrl} alt={food.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{food.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[food.status]}`}>
                    {food.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Type: {food.foodType}</p>
                <p className="text-sm text-gray-500 mb-1">Qty: {food.quantity}</p>
                <p className="text-sm text-gray-500 mb-3 truncate">📍 {food.pickupAddress}</p>
                <div className="flex gap-2">
                  <Link to={`/foods/${food.id}`}
                    className="flex-1 text-center border border-green-600 text-green-600 py-1.5 rounded-lg text-sm hover:bg-green-50">
                    Details
                  </Link>
                  {user?.role === 'NGO' && food.status === 'AVAILABLE' && (
                    <button
                      onClick={() => handleClaim(food.id)}
                      className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-sm hover:bg-green-700"
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
