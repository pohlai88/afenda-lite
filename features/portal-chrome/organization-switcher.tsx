'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Building2Icon, CheckIcon } from 'lucide-react'
import { setActiveOrganizationAction } from '@/app/actions/admin'
import { Button } from '@/components-V2/platform-components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components-V2/platform-components/ui/dropdown-menu'
import { useOrganizationSwitcher } from '@/features/portal-chrome/organization-switcher-context'

export function OrganizationSwitcher() {
  const { enabled, organizations, activeOrganizationId } = useOrganizationSwitcher()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!enabled || organizations.length === 0) {
    return null
  }

  const active =
    organizations.find((organization) => organization.id === activeOrganizationId) ??
    organizations[0]

  const showMenu = organizations.length > 1

  if (!showMenu) {
    return (
      <div
        className='text-muted-foreground hidden max-w-40 truncate text-sm sm:block'
        data-testid='organization-switcher-label'
        title={active.name}
      >
        {active.name}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='outline'
            size='sm'
            className='max-w-48 gap-1.5'
            disabled={pending}
            data-testid='organization-switcher'
          />
        }
      >
        <Building2Icon className='size-3.5 shrink-0' />
        <span className='truncate'>{active.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((organization) => {
          const isActive = organization.id === active.id
          return (
            <DropdownMenuItem
              key={organization.id}
              disabled={pending || isActive}
              data-testid={`organization-switcher-item-${organization.id}`}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const result = await setActiveOrganizationAction({
                    organizationId: organization.id,
                  })
                  if (!result.ok) {
                    setError(result.message)
                    return
                  }
                  router.refresh()
                })
              }}
            >
              <span className='flex flex-1 flex-col items-start gap-0.5'>
                <span className='font-medium'>{organization.name}</span>
                <span className='text-muted-foreground text-xs'>{organization.slug}</span>
              </span>
              {isActive ? <CheckIcon className='size-4 shrink-0' /> : null}
            </DropdownMenuItem>
          )
        })}
        {error ? (
          <>
            <DropdownMenuSeparator />
            <p className='text-destructive px-2 py-1.5 text-xs' role='alert'>
              {error}
            </p>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
