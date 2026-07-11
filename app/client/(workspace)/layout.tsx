import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return <div data-segment="client-workspace">{children}</div>
}
