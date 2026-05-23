import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getFoods, createFood, updateFood, deleteFood } from '../services/foodService'
import { useAuth } from '../context/AuthContext'

const emptyForm = { title: '', foodType: '', quantity: '', expiryTime: '', pickupAddress: '', imageUrl: '', contactDetails: '' }

export default function RestaurantDashboard() {
  const { user } = useAuth()
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const fetchFoods = async () => {
    setLoading(true)
    try {
      const res = await getFoods(0, 100)
      const all = res.data.content || res.data
      setFoods(all.filter((f) => f.restaurantId === user?.id))
    } catch {
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFoods() }, [])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowModal(true) }
  const openEdit = (food) => {
    setForm({
      title: food.title, foodType: food.foodType, quantity: food.quantity,
      expiryTime: food.expiryTime?.slice(0, 16), pickupAddress: food.pickupAddress,
      imageUrl: food.imageUrl || '', contactDetails: food.contactDetails || ''
    })
    setEditId(food.id)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, quantity: parseInt(form.quantity) }
      if (editId) {
        await updateFood(editId, payload)
        toast.success('Post updated!')
      } else {
        await createFood(payload)
        toast.success('Post created!')
      }
      setShowModal(false)
      fetchFoods()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await deleteFood(id)
      toast.success('Deleted!')
      fetchFoods()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const statusColor = { AVAILABLE: 'bg-green-100 text-green-700', CLAIMED: 'bg-yellow-100 text-yellow-700', EXPIRED: 'bg-red-100 text-red-700' }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Food Posts</h1>
        <button onClick={openCreate}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
          + New Post
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : foods.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No posts yet. Create your first donation!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {foods.map((food) => (
            <div key={food.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{food.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor[food.status]}`}>{food.status}</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{food.foodType} · {food.quantity} units</p>
              <p className="text-sm text-gray-500 mb-3 truncate">📍 {food.pickupAddress}</p>
              <div className="flex gap-2">
                <button onClick={() => openEdit(food)}
                  className="flex-1 border border-green-600 text-green-600 py-1.5 rounded text-sm hover:bg-green-50">
                  Edit
                </button>
                <button onClick={() => handleDelete(food.id)}
                  className="flex-1 border border-red-400 text-red-500 py-1.5 rounded text-sm hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editId ? 'Edit Post' : 'New Food Post'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Title', key: 'title', type: 'text' },
                { label: 'Food Type', key: 'foodType', type: 'text' },
                { label: 'Quantity', key: 'quantity', type: 'number' },
                { label: 'Expiry Time', key: 'expiryTime', type: 'datetime-local' },
                { label: 'Pickup Address', key: 'pickupAddress', type: 'text' },
                { label: 'Image URL', key: 'imageUrl', type: 'url' },
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
                <button type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700">
                  {editId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50">
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
