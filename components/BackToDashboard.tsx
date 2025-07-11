'use client'

import { useRouter } from 'next/navigation'

export default function BackToDashboard() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/dashboard')}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      ← Back to Dashboard
    </button>
  )
}
