// Third-party Imports
import type * as Icon from 'lucide-react'
import type { ShellModuleId, ShellNavKind } from '@/modules/platform/shell/access'

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
      activePath?: string
      badge?: string
      badgeClassName?: string
      childItems?: never
      target?: '_blank' | '_self' | '_parent' | '_top'
    }
  | { href?: never; badge?: never; activePath?: never; childItems: MenuSubItem[] }
)

export type NavItem = {
  groupLabel?: string
  /** module = product module; admin = organization-admin routes only */
  kind: ShellNavKind
  moduleId?: ShellModuleId
  items: MenuItem[]
}

export const navItems: NavItem[] = [
  {
    groupLabel: 'Declarations',
    kind: 'module',
    moduleId: 'declarations',
    items: [
      {
        icon: 'ClipboardList',
        label: 'Declarations',
        href: '/dashboard',
      },
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
  {
    groupLabel: 'Feed Farm Trade',
    kind: 'module',
    moduleId: 'feed-farm-trade',
    items: [
      {
        icon: 'Store',
        label: 'Events',
        href: '/trade/events',
        activePath: '/trade/events',
      },
      {
        icon: 'ShoppingBag',
        label: 'My orders',
        href: '/trade/my-orders',
      },
      {
        icon: 'Settings2',
        label: 'Admin events',
        href: '/trade/admin/events',
        activePath: '/trade/admin/events',
      },
    ],
  },
]
