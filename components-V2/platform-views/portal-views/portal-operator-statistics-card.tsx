/**
 * AdminCN statistics-card-05 DNA (statistics-component / sales-dashboard).
 * Landed block: components-V2/platform-views/dashboards/statistics/statistics-card-05.tsx
 * Portal variant: description instead of fabricated week-over-week %.
 */

import type { ReactElement } from 'react'

import { Avatar, AvatarFallback } from '@/components-V2/platform-components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components-V2/platform-components/ui/card'
import { cn } from '@/components-V2/lib/utils'

export type PortalOperatorStatisticsCardProps = {
  icon: ReactElement
  title: string
  description: string
  value: string
  className?: string
  iconClassName?: string
}

export default function PortalOperatorStatisticsCard({
  icon,
  title,
  description,
  value,
  className,
  iconClassName
}: PortalOperatorStatisticsCardProps) {
  return (
    <Card className={cn('justify-between shadow-none', className)}>
      <CardHeader>
        <Avatar size='lg' className='rounded-sm after:border-0'>
          <AvatarFallback
            className={cn('bg-primary/10 text-primary shrink-0 rounded-sm [&>svg]:size-5', iconClassName)}
          >
            {icon}
          </AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col justify-around gap-4'>
        <p className='flex flex-col gap-1'>
          <span className='text-base font-semibold'>{title}</span>
          <span className='text-muted-foreground text-sm text-pretty'>{description}</span>
          <span className='text-2xl font-semibold tabular-nums'>{value}</span>
        </p>
      </CardContent>
    </Card>
  )
}
