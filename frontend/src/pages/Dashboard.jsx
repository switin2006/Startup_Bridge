import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Card from '../components/ui/Card'

// Placeholder dashboard. Later phases replace this with role-specific
// content (pitches, interests, negotiations, admin queues).
export default function Dashboard() {
  const { user } = useAuth()

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h2>
      <p className="mb-6 text-gray-500">Role: {user?.role}</p>
      <Card>
        <p className="text-gray-600">
          Your dashboard is coming soon. Pitches, interests, and negotiations will
          appear here as later phases are built.
        </p>
      </Card>
    </Layout>
  )
}
