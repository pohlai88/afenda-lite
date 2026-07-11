'use client'

// React Imports
import type { ComponentType } from 'react'

// Next Imports
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

// Third-party Imports
import * as Icon from 'lucide-react'
import { ChevronRightIcon, SquareArrowOutUpRightIcon } from 'lucide-react'

// Type Imports
import type { MenuGroupSubItem, MenuItem, MenuSubItem } from '@/components-V2/platform-config/navConfig'

// Component Imports
import LogoSvg from '@/components-V2/platform-assets/svg/logo'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components-V2/platform-components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components-V2/platform-components/ui/sidebar'

// Config Imports
import { navItems, type NavItem } from '@/components-V2/platform-config/navConfig'
import themeConfig from '@/components-V2/platform-config/themeConfig'
import { useOrganizationAdminShellFlags } from '@/components-V2/platform-context/organizationAdminShellFlagsContext'
import { useSettings } from '@/components-V2/platform-hooks/use-settings'
import { ORG_OPERATOR_PLAYGROUND_ROUTE } from '@/modules/platform/routing/portal-nav-routes'
import { portalCopy } from '@/modules/platform/copy/portal-copy'

// Util Imports
import { cn } from '@/components-V2/lib/utils'

const playgroundNavGroup: NavItem = {
  groupLabel: 'Developer',
  kind: 'admin',
  items: [
    {
      icon: 'LayoutGrid',
      label: portalCopy.nav.playground,
      href: ORG_OPERATOR_PLAYGROUND_ROUTE.href,
      activePath: '/playground',
    },
  ],
}

function isNavGroupVisible(
  navItem: NavItem,
  entitledModules: readonly string[],
  isOrgAdmin: boolean,
): boolean {
  if (navItem.kind === 'admin') {
    return isOrgAdmin
  }
  return Boolean(navItem.moduleId && entitledModules.includes(navItem.moduleId))
}

const isSubGroup = (item: MenuSubItem): item is MenuGroupSubItem => 'childItems' in item

const isExternalLink = (href: string) => href.startsWith('http://') || href.startsWith('https://')

function isLinkActive(
  href: string,
  activePath: string | undefined,
  pathname: string,
  searchParams: Pick<URLSearchParams, 'get'>
): boolean {
  if (activePath) {
    return pathname === activePath || pathname.startsWith(`${activePath}/`)
  }

  if (href.includes('?')) {
    const [hrefPath, hrefQuery] = href.split('?')

    if (pathname !== hrefPath) return false

    const hrefParams = new URLSearchParams(hrefQuery)

    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false
    }

    return true
  }

  return pathname === href
}

const SidebarGroupedMenuItems = ({
  data,
  groupLabel,
  pathname,
  searchParams
}: {
  data: MenuItem[]
  groupLabel?: string
  pathname: string
  searchParams: Pick<URLSearchParams, 'get'>
}) => {
  return (
    <SidebarGroup>
      {groupLabel && (
        <SidebarGroupLabel className='text-sidebar-foreground/50 tracking-wider uppercase'>
          {groupLabel}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {data.map(item => {
            const Tag = item.icon ? (Icon[item.icon] as ComponentType) : null

            const isChildActive =
              item.childItems?.some(subItem =>
                isSubGroup(subItem)
                  ? subItem.childItems.some(leaf => isLinkActive(leaf.href, leaf.activePath, pathname, searchParams))
                  : isLinkActive(subItem.href, subItem.activePath, pathname, searchParams)
              ) ?? false

            return item.childItems ? (
              <Collapsible className='group/collapsible' key={item.label}>
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        tooltip={item.label}
                        isActive={isChildActive}
                        className='data-active:bg-primary/5!'
                      />
                    }
                  >
                    {Tag && <Tag />}
                    <span>{item.label}</span>
                    <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90' />
                  </CollapsibleTrigger>
                  <CollapsibleContent className='h-(--collapsible-panel-height) overflow-hidden transition-all duration-200 data-ending-style:h-0 data-starting-style:h-0'>
                    <SidebarMenuSub>
                      {item.childItems.map(subItem =>
                        isSubGroup(subItem) ? (
                          <Collapsible className='group/subcollapsible' key={subItem.label}>
                            <SidebarMenuSubItem>
                              <CollapsibleTrigger
                                nativeButton={false}
                                render={
                                  <SidebarMenuSubButton
                                    className='data-active:bg-primary/10! justify-between'
                                    isActive={subItem.childItems.some(leaf =>
                                      isLinkActive(leaf.href, leaf.activePath, pathname, searchParams)
                                    )}
                                  />
                                }
                              >
                                {subItem.label}
                                <ChevronRightIcon className='ml-auto shrink-0 transition-transform duration-200 group-data-open/subcollapsible:rotate-90' />
                              </CollapsibleTrigger>
                              <CollapsibleContent className='h-(--collapsible-panel-height) overflow-hidden transition-all duration-200 data-ending-style:h-0 data-starting-style:h-0'>
                                <SidebarMenuSub className='mx-0'>
                                  {subItem.childItems.map(leaf => (
                                    <SidebarMenuSubItem key={leaf.label}>
                                      <SidebarMenuSubButton
                                        className='data-active:bg-primary/10! justify-between'
                                        render={<Link href={leaf.href} target={leaf.target} />}
                                        isActive={isLinkActive(leaf.href, leaf.activePath, pathname, searchParams)}
                                      >
                                        {leaf.label}
                                        {isExternalLink(leaf.href) && (
                                          <SquareArrowOutUpRightIcon className='ml-auto size-3.5! shrink-0 opacity-50' />
                                        )}
                                        {leaf.badge && (
                                          <SidebarMenuBadge
                                            className={cn(
                                              'bg-primary/10 rounded-full px-1.5 font-normal',
                                              leaf.badgeClassName
                                            )}
                                          >
                                            {leaf.badge}
                                          </SidebarMenuBadge>
                                        )}
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuSubItem>
                          </Collapsible>
                        ) : (
                          <SidebarMenuSubItem key={subItem.label}>
                            <SidebarMenuSubButton
                              className='data-active:bg-primary/10! justify-between'
                              render={<Link href={subItem.href} target={subItem.target} />}
                              isActive={isLinkActive(subItem.href, subItem.activePath, pathname, searchParams)}
                            >
                              {subItem.label}
                              {isExternalLink(subItem.href) && (
                                <SquareArrowOutUpRightIcon className='ml-auto size-3.5! shrink-0 opacity-50' />
                              )}
                              {subItem.badge && (
                                <SidebarMenuBadge
                                  className={cn(
                                    'bg-primary/10 rounded-full px-1.5 font-normal',
                                    subItem.badgeClassName
                                  )}
                                >
                                  {subItem.badge}
                                </SidebarMenuBadge>
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  tooltip={item.label}
                  render={<Link href={item.href} target={item.target} />}
                  isActive={isLinkActive(item.href, item.activePath, pathname, searchParams)}
                  className='data-active:bg-primary/10!'
                >
                  {Tag && <Tag />}
                  <span>{item.label}</span>
                  {isExternalLink(item.href) && (
                    <SquareArrowOutUpRightIcon className='ml-auto size-3.5! shrink-0 opacity-50' />
                  )}
                </SidebarMenuButton>
                {item.badge && (
                  <SidebarMenuBadge
                    className={cn('bg-primary/10 rounded-full px-1.5 font-normal', item.badgeClassName)}
                  >
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

const SidebarLayout = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { settings } = useSettings()
  const { showPlayground, entitledModules, isOrgAdmin } = useOrganizationAdminShellFlags()
  const withPlayground = showPlayground ? [...navItems, playgroundNavGroup] : navItems
  const resolvedNavItems = withPlayground.filter((item) =>
    isNavGroupVisible(item, entitledModules, isOrgAdmin),
  )

  // Use 'icon' as default collapsible behavior when sidebarOpen is true
  // This ensures the sidebar trigger still works
  const collapsibleMode = settings.sidebarOpen ? 'icon' : settings.collapsible

  return (
    <Sidebar collapsible={collapsibleMode} variant={settings.variant === 'default' ? 'sidebar' : settings.variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              className='gap-2.5 bg-transparent! [&>svg]:size-8'
              render={<Link href={`${themeConfig.homePageUrl}`} />}
            >
              <LogoSvg className='[&_rect]:fill-sidebar [&_rect:first-child]:fill-primary' />
              <div className='flex flex-col items-start'>
                <span className='text-lg font-semibold text-nowrap'>{themeConfig.templateName}</span>
                <span className='text-xs font-light text-nowrap'>Dashboard Template</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className='group-data-[collapsible=icon]:overflow-y-auto'>
        {resolvedNavItems.map((navItem, index) => {
          return (
            <SidebarGroupedMenuItems
              key={navItem.groupLabel || index}
              data={navItem.items}
              groupLabel={navItem.groupLabel}
              pathname={pathname}
              searchParams={searchParams}
            />
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}

export default SidebarLayout
