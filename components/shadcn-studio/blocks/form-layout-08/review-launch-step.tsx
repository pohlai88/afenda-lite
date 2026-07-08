import { IconPlaceholder } from '@/registry/icons/icon-placeholder'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { CardContent } from '@/components/ui/card'

import MultiStep02ReviewCompleteSVG from '@/assets/svg/multi-step-02-review-complete'
import type { StepperType } from '@/components/shadcn-studio/blocks/form-layout-08/form-layout-08'

const ReviewLaunchStep = ({ stepper }: { stepper: StepperType }) => {
  return (
    <CardContent className='col-span-5 flex flex-col gap-6 p-6 md:col-span-3'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='flex flex-col gap-4'>
          <p className='text-2xl font-semibold'>Ready to Launch! 🚀</p>
          <p className='text-muted-foreground text-base'>
            Review your product information before publishing to the marketplace.
          </p>
          <div className='text-muted-foreground flex flex-col gap-4 text-base'>
            <div className='flex items-center gap-3'>
              <p className='text-foreground w-30 font-medium'>Category</p>
              <p>Electronics</p>
            </div>
            <div className='flex items-center gap-3'>
              <p className='text-foreground w-30 font-medium'>Product Name</p>
              <p>iPhone 15 Pro Max 256GB</p>
            </div>
            <div className='flex items-center gap-3'>
              <p className='text-foreground w-30 font-medium'>SKU</p>
              <p>APIP15PM256-BLK</p>
            </div>
            <div className='flex items-center gap-3'>
              <p className='text-foreground w-30 font-medium'>Regular Price</p>
              <p>$999.00</p>
            </div>
            <div className='flex items-center gap-3'>
              <p className='text-foreground w-30 font-medium'>Sale Price</p>
              <p>$899.00</p>
            </div>
            <div className='flex items-center gap-3'>
              <p className='text-foreground w-30 font-medium'>Stock</p>
              <p>150 units</p>
            </div>
            <div className='flex items-center gap-2'>
              <Switch id='confirm-deal-details' />
              <Label htmlFor='confirm-deal-details' className='text-foreground'>
                I have verified all product details
              </Label>
            </div>
          </div>
        </div>
        <div className='flex items-center justify-center'>
          <MultiStep02ReviewCompleteSVG className='opacity-70' />
        </div>
      </div>
      <div className='flex justify-between gap-4'>
        <Button variant='secondary' size='lg' onClick={() => stepper.navigation.prev()}>
          <IconPlaceholder
            lucide='ArrowLeftIcon'
            tabler='IconArrowLeft'
            hugeicons='ArrowLeft02Icon'
            phosphor='ArrowLeftIcon'
            remixicon='RiArrowLeftLine'
          />
          Previous
        </Button>
        <Button
          size='lg'
          onClick={() => stepper.navigation.next()}
          className='bg-green-600 text-white hover:bg-green-600/90 focus-visible:ring-green-600/20 dark:bg-green-400/60 dark:hover:bg-green-400/50 dark:focus-visible:ring-green-400/40'
        >
          Publish Product
        </Button>
      </div>
    </CardContent>
  )
}

export default ReviewLaunchStep
