import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'

import type { StepperType } from '@/components/shadcn-studio/blocks/form-layout-08/form-layout-08'

const PublishedStep = ({ stepper }: { stepper: StepperType }) => {
  return (
    <CardContent className='col-span-5 flex flex-col gap-6 p-6 md:col-span-3'>
      <div className='flex flex-col items-start'>
        <h2 className='text-2xl font-semibold'>Product Published Successfully! 🎉</h2>
        <p className='text-muted-foreground'>Your product is now live on the marketplace.</p>
      </div>
      <div className='flex justify-end'>
        <Button size='lg' onClick={stepper.navigation.reset}>
          Reset
        </Button>
      </div>
    </CardContent>
  )
}

export default PublishedStep
