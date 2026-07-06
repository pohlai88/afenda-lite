import { cn } from '@/lib/utils'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine
} from '@/components/ui/timeline'
import { LoaderIcon, CircleCheckIcon, DotIcon } from "lucide-react"

function OnboardingFeed() {
  const items = [
    {
      id: 'account-login',
      title: 'Account Log In',
      time: '3 days ago',
      content: 'You successfully logged in to your account',
      icon: 'check'
    },
    {
      id: 'created-workspace',
      title: 'Created Workspace',
      time: '2 days ago',
      content: 'You successfully created your first workspace in privacy mode',
      icon: 'check'
    },
    {
      id: 'connected-db',
      title: 'Connected database',
      time: '2 hours ago',
      content: 'You successfully connected your database',
      icon: 'check'
    },
    {
      id: 'add-payment',
      title: 'Add payment method',
      time: 'Running now....',
      content: 'Identifying payment method and verifying details',
      icon: 'loader'
    },
    {
      id: 'invite-team',
      title: 'Invite team members',
      time: 'Upcoming',
      content: 'Add team members to workspace',
      icon: 'loader'
    }
  ]

  return (
    <Card className='w-full max-w-lg'>
      <CardHeader>
        <CardTitle className='leading-none font-semibold'>Workspace setup</CardTitle>
        <CardDescription>Setup your workspace step by step</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4 text-sm'>
        <Timeline>
          {items.map((timeline, idx) => {
            const isLast = idx === items.length - 1

            const lineClass = cn(
              'min-h-10',
              timeline.icon === 'loader'
                ? 'bg-[repeating-linear-gradient(0deg,var(--border),var(--border)_5px,var(--card)_6px,var(--card)_10px)]'
                : 'border'
            )

            return (
              <TimelineItem key={timeline.id} status='done' className='mt-1 gap-x-0'>
                <TimelineDot status='custom' className='mb-1.25'>
                  {timeline.icon === 'loader' ? (
                    <LoaderIcon className='text-primary size-4' />
                  ) : (
                    <CircleCheckIcon className='text-primary size-4' />
                  )}
                </TimelineDot>
                {!isLast && <TimelineLine className={lineClass} />}
                <TimelineHeading className='ml-4 flex items-center gap-1'>
                  <span className='font-medium'>{timeline.title}</span>
                  <DotIcon className='text-muted-foreground size-2' />
                  <span className='text-muted-foreground text-xs'>{timeline.time}</span>
                </TimelineHeading>
                <TimelineContent className={cn('ml-4', isLast && 'pb-0')}>
                  <span className='text-muted-foreground text-sm'>{timeline.content}</span>
                </TimelineContent>
              </TimelineItem>
            )
          })}
        </Timeline>
      </CardContent>
    </Card>
  )
}

export default OnboardingFeed
