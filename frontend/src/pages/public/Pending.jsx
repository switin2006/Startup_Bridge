import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'

// Shown right after registration — the account exists but needs admin approval.
export default function Pending() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
          <span className="text-amber-600 text-xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Awaiting admin approval</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your account has been created. An admin will review and approve it shortly.
          You can log in once your account is approved.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-block text-sm text-indigo-600 hover:underline"
        >
          Go to Login
        </Link>
      </Card>
    </div>
  )
}
