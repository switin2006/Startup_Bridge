import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  // Rename useAuth's register so it doesn't clash with useForm's register
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(data) {
    setServerError('')
    setSubmitting(true)
    try {
      await registerUser(data)
      navigate('/pending')
    } catch (err) {
      setServerError(err.response?.data?.error || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-10">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create an account</h2>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full name"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            {...register('email', { required: 'Email is required' })}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'At least 6 characters' },
            })}
            error={errors.password?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('role', { required: 'Please choose a role' })}
            >
              <option value="">Select…</option>
              <option value="startup">Startup Founder</option>
              <option value="investor">Investor</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <Input label="Contact phone (optional)" {...register('contact_phone')} />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creating…' : 'Register'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </div>
  )
}
