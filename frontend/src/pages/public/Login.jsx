import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(data) {
    setServerError('')
    setSubmitting(true)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed'
      // Redirect pending users to the /pending page instead of showing inline error
      if (message.toLowerCase().includes('awaiting admin approval')) {
        navigate('/pending')
        return
      }
      setServerError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Login</h2>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            {...register('email', { required: 'Email is required' })}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            {...register('password', { required: 'Password is required' })}
            error={errors.password?.message}
          />
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Logging in…' : 'Login'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          No account?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </div>
  )
}
