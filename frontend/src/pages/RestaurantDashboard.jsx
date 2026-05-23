import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getMyFoods, createFood, updateFood, deleteFood } from '../services/foodService'
import { getClaims, updateClaim } from '../services/claimService'

const emptyForm = {
  title: '', foodType: '', quantity: '', expiryTime: '',
  pickupAddress: '', imageUrl: '', contactDetails: ''
}

const statusColor = {
  AVAILABLE: 'bg-green-100 text-green-700',
  CLAIMED:   'bg-yellow-100 text-yellow-700',
  EXPIRED:   'bg-red-100 text-red-700',
}

const claimStatusColor = {
  PENDING:   'bg-orange-100 text-orange-700',
  APPROVED:  'bg-green-100 text-green-700',
  PICKED_UP: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function RestaurantDashboard() {
  const [foods, setFoods]         = useState([])
  const [claims, setClaims]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]       = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [activeTab, setActiveTab] = useState('posts') // 'posts' | 'claims'

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [foodsRes, claimsRes] = await Promise.all([getMyFoods(), getClaims()])
      setFoods(foodsRes.data || [])
      setClaims(claimsRes.data || [])
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowModal(true) }

  const openEdit = (food) => {
    setForm({
      title: food.title,
      foodType: food.foodType,
      quantity: String(food.quantity),
      expiryTime: food.expiryTime?.slice(0, 16) || '',
      pickupAddress: food.pickupAddress,
      imageUrl: food.imageUrl || '',
      contactDetails: food.contactDetails || '',
    })
    setEditId(food.id)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, quantity: parseInt(form.quantity, 10) }
      if (editId) {
        await updateFood(editId, payload)
        toast.success('Post updated!')
      } else {
        await createFood(payload)
        toast.success('Food post created!')
      }
      setShowModal(false)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save post')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this food post?')) return
    try {
      await deleteFood(id)
      toast.success('Post deleted')
      fetchAll()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleClaimAction = async (claimId, status) => {
    try {
      await updateClaim(claimId, status)
      toast.success(`Claim ${status.toLowerCase()}`)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    }
  }

  const pendingClaims = claims.filter(c => c.status === 'PENDING')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Restaurant Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your food donations and incoming claims</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
        >
          + New Donation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Posts',  value: foods.length,                                  color: 'text-gray-700' },
          { label: 'Available',    value: foods.filter(f => f.status === 'AVAILABLE').length, color: 'text-green-600' },
          { label: 'Claimed',      value: foods.filter(f => f.status === 'CLAIMED').length,   color: 'text-yellow-600' },
          { label: 'Pending Approvals', value: pendingClaims.length,                     color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: 'posts',  label: `My Posts (${foods.length})` },
          { key: 'claims', label: `Incoming Claims (${claims.length})${pendingClaims.length ? ` · ${pendingClaims.length} pending` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : activeTab === 'posts' ? (

        /* ── POSTS TAB ── */
        foods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No food posts yet.</p>
            <button onClick={openCreate} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              Create your first donation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {foods.map((food) => (
              <div key={food.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
                {food.imageUrl && (
                  <img src={food.imageUrl} alt={food.title} className="w-full h-36 object-cover rounded-lg mb-3" />
                )}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 leading-tight">{food.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 shrink-0 ${statusColor[food.status]}`}>
                    {food.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">{food.foodType} · {food.quantity} units</p>
                <p className="text-sm text-gray-500 mb-1 truncate">📍 {food.pickupAddress}</p>
                <p className="text-xs text-gray-400 mb-3">
                  Expires: {food.expiryTime ? new Date(food.expiryTime).toLocaleString() : '—'}
                </p>
                {food.claimedByName && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mb-3">
                    🤝 Claimed by {food.claimedByName}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(food)}
                    disabled={food.status === 'CLAIMED'}
                    className="flex-1 border border-green-600 text-green-600 py-1.5 rounded text-sm hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(food.id)}
                    disabled={food.status === 'CLAIMED'}
                    className="flex-1 border border-red-400 text-red-500 py-1.5 rounded text-sm hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )

      ) : (

        /* ── CLAIMS TAB ── */
        claims.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No claims received yet.</div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => {
              const food = foods.find(f => f.id === claim.foodPostId)
              return (
                <div key={claim.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {food ? food.title : `Food #${claim.foodPostId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      NGO: <span className="font-medium">{claim.ngoName || claim.ngoId?.slice(0, 8)}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(claim.claimedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${claimStatusColor[claim.status]}`}>
                      {claim.status}
                    </span>
                    {claim.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleClaimAction(claim.id, 'APPROVED')}
                          className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleClaimAction(claim.id, 'CANCELLED')}
                          className="text-sm border border-red-400 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                    {claim.status === 'APPROVED' && (
                      <span className="text-xs text-green-600 font-medium">Awaiting pickup</span>
                    )}
                    {claim.status === 'PICKED_UP' && (
                      <span className="text-xs text-blue-600 font-medium">✓ Picked up</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editId ? 'Edit Food Post' : 'New Food Donation'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Title',           key: 'title',          type: 'text' },
                { label: 'Food Type',       key: 'foodType',       type: 'text' },
                { label: 'Quantity',        key: 'quantity',       type: 'number' },
                { label: 'Expiry Time',     key: 'expiryTime',     type: 'datetime-local' },
                { label: 'Pickup Address',  key: 'pickupAddress',  type: 'text' },
                { label: 'Image URL',       key: 'imageUrl',       type: 'url' },
                { label: 'Contact Details', key: 'contactDetails', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    required={key !== 'imageUrl' && key !== 'contactDetails'}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700"
                >
                  {editId ? 'Update Post' : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
