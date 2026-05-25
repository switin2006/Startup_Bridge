import { forwardRef } from 'react'

// Reusable text input with an optional label and error message.
// forwardRef is required so react-hook-form's register() can attach its ref.
const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <input
        ref={ref}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
})

export default Input
