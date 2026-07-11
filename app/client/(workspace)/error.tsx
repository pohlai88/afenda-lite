'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
