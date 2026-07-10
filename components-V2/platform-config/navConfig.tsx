// Third-party Imports
import type * as Icon from 'lucide-react'

type IconName = keyof typeof Icon

export type MenuLeafSubItem = {
  label: string
  href: string
  activePath?: string
  badge?: string
  badgeClassName?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
}

export type MenuGroupSubItem = {
  label: string
  childItems: MenuLeafSubItem[]
}

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem

export type MenuItem = {
  icon: IconName
  label: string
} & (
  | {
      href: string
      badge?: string
      badgeClassName?: string
      childItems?: never
      target?: '_blank' | '_self' | '_parent' | '_top'
    }
  | { href?: never; badge?: never; childItems: MenuSubItem[] }
)

export type NavItem = {
  groupLabel?: string
  items: MenuItem[]
}

export const navItems: NavItem[] = [
  {
    groupLabel: 'Dashboard',
    items: [
      {
        icon: 'ClipboardList',
        label: 'Declarations',
        href: '/dashboard',
      },
    ],
  },
  {
    groupLabel: 'Portal',
    items: [
      {
        icon: 'UsersIcon',
        label: 'Clients',
        href: '/dashboard/clients',
      },
      {
        icon: 'UserCogIcon',
        label: 'Account',
        href: '/account/settings',
      },
    ],
  },
]
