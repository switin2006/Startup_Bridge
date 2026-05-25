import { Link } from 'react-router-dom'

// Public landing page — first thing a visitor sees.
export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold text-gray-900">StartupBridge</h1>
      <p className="mt-3 max-w-md text-center text-lg text-gray-600">
        Where startup founders meet investors — with admin oversight at every step.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          to="/login"
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          Login
        </Link>
        <Link
          to="/register"
          className="px-6 py-2.5 bg-white border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50"
        >
          Register
        </Link>
      </div>
    </div>
  )
}
