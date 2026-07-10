'use client'

import { useEffect } from 'react'

type PortalErrorBoundaryProps = {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Shared Next.js route-segment error boundary.
 * Re-export as default from each route's `error.tsx`.
 *
 * Uses `reset` (Next.js < 16.2). Upgrade to `unstable_retry` when on 16.2+.
 */
export function PortalErrorBoundary({ error, reset }: PortalErrorBoundaryProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className='portal-centered-state'>
      <p className='portal-state-kicker'>Error</p>
      <p className='portal-state-title'>Something went wrong</p>
      {error.digest ? <p className='portal-code-block'>{error.digest}</p> : null}
      <button className='mt-4' onClick={reset} type='button'>
        Try again
      </button>
    </div>
  )
}
