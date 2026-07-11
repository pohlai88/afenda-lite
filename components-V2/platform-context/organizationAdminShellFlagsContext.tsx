'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ShellModuleId } from '@/modules/platform/shell/access'

type OrganizationAdminShellFlags = {
  /** Local-only: PLAYGROUND_ENABLED — show Playground in operator AdminCN nav. */
  showPlayground: boolean
  /** Product modules the session may see in the sidebar. */
  entitledModules: ShellModuleId[]
  /** Organization admin — admin-route nav items only. */
  isOrgAdmin: boolean
}

const OrganizationAdminShellFlagsContext = createContext<OrganizationAdminShellFlags>({
  showPlayground: false,
  entitledModules: ['declarations'],
  isOrgAdmin: false,
})

export function OrganizationAdminShellFlagsProvider({
  showPlayground,
  entitledModules,
  isOrgAdmin,
  children,
}: OrganizationAdminShellFlags & { children: ReactNode }) {
  return (
    <OrganizationAdminShellFlagsContext.Provider
      value={{ showPlayground, entitledModules, isOrgAdmin }}
    >
      {children}
    </OrganizationAdminShellFlagsContext.Provider>
  )
}

export function useOrganizationAdminShellFlags() {
  return useContext(OrganizationAdminShellFlagsContext)
}
