import Link from 'next/link'
import {
  BarChart3Icon,
  ClipboardListIcon,
  UsersIcon
} from 'lucide-react'

import { Button } from '@/components-V2/platform-components/ui/button'
import { Card } from '@/components-V2/platform-components/ui/card'
import { PortalDeclarationsDatatable } from '@/components-V2/platform-views/portal-views/portal-declarations-datatable'
import PortalOrganizationAdminStatisticsCard from '@/components-V2/platform-views/portal-views/portal-organization-admin-statistics-card'
import type { OrganizationAdminDashboardPageData } from '@/features/organization-admin/organization-admin-dashboard-page'
import { portalCopy } from '@/modules/platform/copy/portal-copy'
import { ORGANIZATION_ADMIN_CLIENTS_HREF } from '@/modules/platform/routing/portal-routes'

/**
 * AdminCN sales-dashboard composition for `/dashboard`.
 * Statistics DNA: statistics-card-05 · Table DNA: datatable-component-05 (invoice).
 */
export default function OrganizationAdminDeclarationsDashboard({
  data
}: {
  data: OrganizationAdminDashboardPageData
}) {
  const { org } = portalCopy
  const { declarationRows, pendingAssignments, totalResponses } = data

  const stats = [
    {
      icon: <ClipboardListIcon />,
      value: String(declarationRows.length),
      title: org.stats.declarations.title,
      description: org.stats.declarations.detail,
      iconClassName: 'bg-chart-1/10 text-chart-1'
    },
    {
      icon: <BarChart3Icon />,
      value: String(totalResponses),
      title: org.stats.submissions.title,
      description: org.stats.submissions.detail,
      iconClassName: 'bg-chart-2/10 text-chart-2'
    },
    {
      icon: <UsersIcon />,
      value: String(pendingAssignments),
      title: org.stats.pendingAssignments.title,
      description: org.stats.pendingAssignments.detail,
      iconClassName: 'bg-chart-5/10 text-chart-5'
    }
  ]

  return (
    <div className='flex flex-col gap-6'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            {org.eyebrow}
          </p>
          <h1 className='text-2xl font-semibold tracking-tight'>{org.title}</h1>
          <p className='text-muted-foreground max-w-2xl text-sm text-pretty'>{org.description}</p>
        </div>
        <Button
          variant='outline'
          size='sm'
          render={<Link href={ORGANIZATION_ADMIN_CLIENTS_HREF} />}
          nativeButton={false}
        >
          {org.list.inviteClients}
        </Button>
      </header>

      <div className='grid grid-cols-6 gap-6'>
        {stats.map(card => (
          <PortalOrganizationAdminStatisticsCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            description={card.description}
            value={card.value}
            iconClassName={card.iconClassName}
            className='col-span-2 max-md:col-span-3 max-sm:col-span-full'
          />
        ))}

        <Card className='col-span-full py-0 shadow-none'>
          <PortalDeclarationsDatatable rows={declarationRows} />
        </Card>
      </div>
    </div>
  )
}
