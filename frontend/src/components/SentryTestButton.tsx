import { useState } from 'react'

export function SentryTestButton() {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error('This is your first error!')
  }

  return (
    <button
      type="button"
      className="fixed bottom-4 right-4 rounded-md bg-rose-700 px-3 py-2 text-sm text-white shadow-lg"
      onClick={() => setShouldThrow(true)}
    >
      Break the world
    </button>
  )
}
