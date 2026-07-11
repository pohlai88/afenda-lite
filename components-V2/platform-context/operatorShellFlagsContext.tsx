'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ShellModuleId } from '@/modules/platform/shell/access'

type OperatorShellFlags = {
  /** Local-only: PLAYGROUND_ENABLED — show Playground in operator AdminCN nav. */
  showPlayground: boolean
  /** Product modules the session may see in the sidebar. */
  entitledModules: ShellModuleId[]
  /** Organization admin — admin-route nav items only. */
  isOrgAdmin: boolean
}

const OperatorShellFlagsContext = createContext<OperatorShellFlags>({
  showPlayground: false,
  entitledModules: ['declarations'],
  isOrgAdmin: false,
})

export function OperatorShellFlagsProvider({
  showPlayground,
  entitledModules,
  isOrgAdmin,
  children,
}: OperatorShellFlags & { children: ReactNode }) {
  return (
    <OperatorShellFlagsContext.Provider
      value={{ showPlayground, entitledModules, isOrgAdmin }}
    >
      {children}
    </OperatorShellFlagsContext.Provider>
  )
}

export function useOperatorShellFlags() {
  return useContext(OperatorShellFlagsContext)
}
