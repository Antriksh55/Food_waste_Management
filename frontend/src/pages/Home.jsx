import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-green-800 mb-6">
          Reduce Food Waste.
          <br />
          <span className="text-green-500 text-5xl sm:text-6xl font-extrabold tracking-wide">
            Antriksh
          </span>
          <br />
          Feed Communities.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          FoodShare connects restaurants, bakeries, and grocery stores with NGOs and individuals
          in need — so surplus food reaches people, not landfills.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/foods"
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition">
            Browse Available Food
          </Link>
          <Link to="/register"
            className="border-2 border-green-600 text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition">
            Join the Platform
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: '🍽️', title: 'Donate Surplus Food', desc: 'Restaurants post available food before it expires.' },
            { icon: '🔍', title: 'Find Food Near You', desc: 'NGOs search by city, type, and quantity.' },
            { icon: '🤝', title: 'Coordinate Pickup', desc: 'Claim food and arrange pickup seamlessly.' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">Who is it for?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { role: 'Restaurants & Bakeries', desc: 'Post surplus food, manage donations, track claims.', link: '/register', cta: 'Register as Donor' },
              { role: 'NGOs & Volunteers', desc: 'Browse, claim, and collect food for communities.', link: '/register', cta: 'Register as NGO' },
              { role: 'Admins', desc: 'Oversee platform activity and manage users.', link: '/login', cta: 'Admin Login' },
            ].map((r) => (
              <div key={r.role} className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-800 mb-2">{r.role}</h3>
                <p className="text-gray-500 text-sm mb-4">{r.desc}</p>
                <Link to={r.link} className="text-green-600 text-sm font-medium hover:underline">{r.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
