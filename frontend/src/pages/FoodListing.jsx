import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getFoods, searchFoods } from '../services/foodService'
import { createClaim, getClaims } from '../services/claimService'
import { useAuth } from '../context/AuthContext'

export default function FoodListing() {
  const { user } = useAuth()
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null)
  // Set of foodPostIds that this NGO has an active (PENDING) claim on
  const [pendingClaimIds, setPendingClaimIds] = useState(new Set())
  const [filters, setFilters] = useState({ city: '', foodType: '', minQuantity: '' })

  // Fetch food posts + this NGO's existing claims in parallel
  const fetchAll = async () => {
    setLoading(true)
    try {
      const hasFilter = filters.city || filters.foodType || filters.minQuantity
      const foodsPromise = hasFilter
        ? searchFoods({
            city: filters.city || undefined,
            foodType: filters.foodType || undefined,
            minQuantity: filters.minQuantity || undefined,
          })
        : getFoods()

      // Only fetch claims if logged in as NGO
      const claimsPromise = user?.role === 'NGO' ? getClaims() : Promise.resolve(null)

      const [foodsRes, claimsRes] = await Promise.all([foodsPromise, claimsPromise])
      setFoods(foodsRes.data.content || foodsRes.data)

      if (claimsRes) {
        // Build a set of foodPostIds where this NGO has a PENDING claim
        const pending = new Set(
          (claimsRes.data || [])
            .filter(c => c.status === 'PENDING')
            .map(c => c.foodPostId)
        )
        setPendingClaimIds(pending)
      }
    } catch {
      toast.error('Failed to load food listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleClaim = async (food) => {
    setSubmitting(food.id)
    try {
      const ngoName = user?.name || user?.email || 'NGO'
      await createClaim(food.id, ngoName)
      toast.success('Claim submitted! Waiting for restaurant approval.')
      // Optimistically mark as pending without re-fetching
      setPendingClaimIds(prev => new Set([...prev, food.id]))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim food')
    } finally {
      setSubmitting(null)
    }
  }

  const statusBadge = {
    AVAILABLE: 'bg-green-100 text-green-700',
    CLAIMED:   'bg-yellow-100 text-yellow-700',
    EXPIRED:   'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Food Donations</h1>

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
          onClick={fetchAll}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Search
        </button>
        <button
          onClick={() => { setFilters({ city: '', foodType: '', minQuantity: '' }); setTimeout(fetchAll, 0) }}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* Legend for NGO users */}
      {user?.role === 'NGO' && (
        <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Available to claim
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span> Your claim pending restaurant approval
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> Claimed by another NGO
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : foods.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No food found matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {foods.map((food) => {
            const isClaimed      = food.status === 'CLAIMED'
            const isExpired      = food.status === 'EXPIRED'
            const isAvailable    = food.status === 'AVAILABLE'
            const isSubmitting   = submitting === food.id
            // This NGO has a pending claim on this food (awaiting restaurant approval)
            const myPendingClaim = isAvailable && pendingClaimIds.has(food.id)
            // Can still click Claim only if available AND no pending claim from this NGO
            const canClaim       = isAvailable && !myPendingClaim && !isSubmitting

            return (
              <div
                key={food.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden transition hover:shadow-md ${
                  isClaimed || isExpired ? 'opacity-75' : ''
                }`}
              >
                {food.imageUrl && (
                  <div className="relative">
                    <img src={food.imageUrl} alt={food.title} className="w-full h-40 object-cover" />
                    {isClaimed && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                          Claimed
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{food.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[food.status]}`}>
                      {food.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-1">Type: {food.foodType}</p>
                  <p className="text-sm text-gray-500 mb-1">Qty: {food.quantity}</p>
                  <p className="text-sm text-gray-500 mb-2 truncate">📍 {food.pickupAddress}</p>

                  {/* Status banners */}
                  {myPendingClaim && (
                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 mb-3">
                      <span className="text-orange-500 text-sm">⏳</span>
                      <span className="text-xs text-orange-800 font-medium">
                        Your claim is pending restaurant approval
                      </span>
                    </div>
                  )}

                  {isClaimed && food.claimedByName && (
                    <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 mb-3">
                      <span className="text-yellow-600 text-sm">🤝</span>
                      <span className="text-xs text-yellow-800 font-medium">
                        Claimed by <span className="font-semibold">{food.claimedByName}</span>
                      </span>
                    </div>
                  )}

                  {isClaimed && !food.claimedByName && (
                    <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 mb-3">
                      <span className="text-xs text-yellow-800 font-medium">🤝 Already claimed</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      to={`/foods/${food.id}`}
                      className="flex-1 text-center border border-green-600 text-green-600 py-1.5 rounded-lg text-sm hover:bg-green-50"
                    >
                      Details
                    </Link>

                    {user?.role === 'NGO' && (
                      <button
                        onClick={() => canClaim && handleClaim(food)}
                        disabled={!canClaim}
                        title={
                          myPendingClaim
                            ? 'Waiting for restaurant to approve your claim'
                            : isClaimed
                            ? 'This food has already been claimed'
                            : isExpired
                            ? 'This food has expired'
                            : 'Claim this food'
                        }
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
                          isSubmitting
                            ? 'bg-green-400 text-white cursor-wait'
                            : canClaim
                            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                            : myPendingClaim
                            ? 'bg-orange-400 text-white cursor-not-allowed'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isSubmitting
                          ? 'Submitting...'
                          : myPendingClaim
                          ? '⏳ Pending'
                          : isClaimed
                          ? 'Claimed'
                          : isExpired
                          ? 'Expired'
                          : 'Claim'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
