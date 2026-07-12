'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type OrganizationSwitcherOrg = {
  id: string
  name: string
  slug: string
}

type OrganizationSwitcherState = {
  enabled: boolean
  organizations: OrganizationSwitcherOrg[]
  activeOrganizationId: string | null
}

const OrganizationSwitcherContext = createContext<OrganizationSwitcherState>({
  enabled: false,
  organizations: [],
  activeOrganizationId: null,
})

export function OrganizationSwitcherProvider({
  enabled,
  organizations,
  activeOrganizationId,
  children,
}: OrganizationSwitcherState & { children: ReactNode }) {
  return (
    <OrganizationSwitcherContext.Provider
      value={{ enabled, organizations, activeOrganizationId }}
    >
      {children}
    </OrganizationSwitcherContext.Provider>
  )
}

export function useOrganizationSwitcher() {
  return useContext(OrganizationSwitcherContext)
}
