'use client'

import * as Stepperize from '@stepperize/react'

import { IconPlaceholder } from '@/registry/icons/icon-placeholder'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { cn } from '@/lib/utils'

import ProductTypeStep from '@/components/shadcn-studio/blocks/form-layout-08/product-type-step'
import ProductDetailsStep from '@/components/shadcn-studio/blocks/form-layout-08/product-details-step'
import PricingInventoryStep from '@/components/shadcn-studio/blocks/form-layout-08/pricing-inventory-step'
import ReviewLaunchStep from '@/components/shadcn-studio/blocks/form-layout-08/review-launch-step'
import PublishedStep from '@/components/shadcn-studio/blocks/form-layout-08/published-step'

const { useStepper } = Stepperize.defineStepper(
  {
    id: 'multi-step-2-deal-type',
    title: 'Product Type',
    description: 'Select product category',
    icon: (
      <IconPlaceholder
        lucide='BoxIcon'
        tabler='IconBox'
        hugeicons='Blockchain01Icon'
        phosphor='CubeIcon'
        remixicon='RiBox3Line'
      />
    )
  },
  {
    id: 'multi-step-2-deal-details',
    title: 'Product Information',
    description: 'Add product details',
    icon: (
      <IconPlaceholder
        lucide='PackageCheckIcon'
        tabler='IconPackage'
        hugeicons='PackageDeliveredIcon'
        phosphor='Package'
        remixicon='RiBox3Line'
      />
    )
  },
  {
    id: 'multi-step-2-deal-usage',
    title: 'Pricing & Inventory',
    description: 'Set price & stock',
    icon: (
      <IconPlaceholder
        lucide='SettingsIcon'
        tabler='IconSettings'
        hugeicons='SettingsIcon'
        phosphor='GearIcon'
        remixicon='RiSettings3Line'
      />
    )
  },
  {
    id: 'multi-step-2-review-complete',
    title: 'Review & Launch',
    description: 'Publish product!',
    icon: (
      <IconPlaceholder
        lucide='RocketIcon'
        tabler='IconRocket'
        hugeicons='Rocket01Icon'
        phosphor='RocketIcon'
        remixicon='RiRocketLine'
      />
    )
  },
  {
    id: 'multi-step-2-complete',
    title: 'Published',
    description: 'Product Live',
    icon: (
      <IconPlaceholder
        lucide='CheckCircleIcon'
        tabler='IconCircleCheck'
        hugeicons='CheckmarkCircle04Icon'
        phosphor='CheckCircleIcon'
        remixicon='RiCheckboxCircleLine'
      />
    )
  }
)

export type StepperType = ReturnType<typeof useStepper>

const MultiStepForm = () => {
  const stepper = useStepper()
  const currentStep = stepper.lookup.getIndex(stepper.state.current.data.id)

  return (
    <Card className='gap-0 p-0 md:grid md:max-lg:grid-cols-5 lg:grid-cols-4'>
      <CardContent className='col-span-5 p-6 max-md:border-b md:border-r md:max-lg:col-span-2 lg:col-span-1'>
        <nav aria-label='Multi Steps'>
          <ol className='flex flex-col justify-between gap-x-2 gap-y-8'>
            {stepper.state.all
              .filter(step => step.id !== 'multi-step-2-complete')
              .map((step, index) => (
                <li key={step.id}>
                  <Button
                    variant='ghost'
                    className='h-auto w-full shrink-0 cursor-pointer justify-start gap-2 rounded bg-transparent! px-0!'
                    onClick={() => stepper.navigation.goTo(step.id)}
                  >
                    <Avatar className='size-10.5'>
                      <AvatarFallback
                        className={cn('*:[svg]:size-5', {
                          'bg-primary text-primary-foreground shadow-sm': index <= currentStep
                        })}
                      >
                        {step.icon}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col items-start'>
                      <span className='text-base'>{step.title}</span>
                      <span className='text-muted-foreground text-sm'>{step.description}</span>
                    </div>
                  </Button>
                </li>
              ))}
          </ol>
        </nav>
      </CardContent>
      {stepper.flow.switch({
        'multi-step-2-deal-type': () => <ProductTypeStep stepper={stepper} />,
        'multi-step-2-deal-details': () => <ProductDetailsStep stepper={stepper} />,
        'multi-step-2-deal-usage': () => <PricingInventoryStep stepper={stepper} />,
        'multi-step-2-review-complete': () => <ReviewLaunchStep stepper={stepper} />,
        'multi-step-2-complete': () => <PublishedStep stepper={stepper} />
      })}
    </Card>
  )
}

export default MultiStepForm
