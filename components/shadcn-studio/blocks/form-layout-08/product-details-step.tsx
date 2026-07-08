'use client'

import { useState } from 'react'

import type { DateRange } from 'react-day-picker'

import { IconPlaceholder } from '@/registry/icons/icon-placeholder'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { StepperType } from '@/components/shadcn-studio/blocks/form-layout-08/form-layout-08'

const categoryItems = [
  { label: 'Select Category', value: null },
  { label: 'Smartphones', value: 'smartphones' },
  { label: 'Laptops & Computers', value: 'laptops' },
  { label: 'Wearables & Smartwatches', value: 'wearables' },
  { label: 'Audio & Headphones', value: 'audio' },
  { label: 'Cameras & Photography', value: 'cameras' },
  { label: 'Gaming Consoles', value: 'gaming' }
]

const warrantyItems = [
  { label: 'Select Warranty', value: null },
  { label: 'No Warranty', value: 'no-warranty' },
  { label: '6 Months', value: '6-months' },
  { label: '1 Year', value: '1-year' },
  { label: '2 Years', value: '2-years' },
  { label: '3 Years', value: '3-years' },
  { label: 'Lifetime Warranty', value: 'lifetime' }
]

const ProductDetailsStep = ({ stepper }: { stepper: StepperType }) => {
  const [range, setRange] = useState<DateRange | undefined>(undefined)

  return (
    <CardContent className='col-span-5 flex flex-col gap-6 p-6 md:col-span-3'>
      <FieldGroup className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
        <Field className='gap-2 md:max-lg:col-span-2'>
          <FieldLabel htmlFor='multi-step-deal-details-title'>Product Name</FieldLabel>
          <InputGroup className='w-full'>
            <InputGroupAddon>
              <IconPlaceholder
                lucide='PackageIcon'
                tabler='IconPackage'
                hugeicons='PackageIcon'
                phosphor='PackageIcon'
                remixicon='RiBox3Line'
                className='size-4'
              />
              <span className='sr-only'>Product</span>
            </InputGroupAddon>
            <InputGroupInput id='multi-step-deal-details-title' placeholder='iPhone 15 Pro Max 256GB' />
          </InputGroup>
        </Field>

        <Field className='gap-2 md:max-lg:col-span-2'>
          <FieldLabel htmlFor='multi-step-deal-details-code'>SKU / Product Code</FieldLabel>
          <InputGroup className='w-full'>
            <InputGroupAddon>
              <IconPlaceholder
                lucide='HashIcon'
                tabler='IconHash'
                hugeicons='HashtagIcon'
                phosphor='HashIcon'
                remixicon='RiHashtag'
                className='size-4'
              />
              <span className='sr-only'>SKU</span>
            </InputGroupAddon>
            <InputGroupInput id='multi-step-deal-details-code' placeholder='APIP15PM256-BLK' />
          </InputGroup>
        </Field>

        <Field className='gap-2 md:max-lg:col-span-2'>
          <FieldLabel htmlFor='multi-step-deal-details-description'>Product Description</FieldLabel>
          <div className='relative w-full'>
            <div className='text-muted-foreground pointer-events-none absolute top-2.5 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
              <IconPlaceholder
                lucide='FileTextIcon'
                tabler='IconFileText'
                hugeicons='File02Icon'
                phosphor='FileTextIcon'
                remixicon='RiFileTextLine'
                className='size-4'
              />
              <span className='sr-only'>Description</span>
            </div>
            <Textarea
              id='multi-step-deal-details-description'
              rows={4}
              placeholder='Describe the product features, specifications, and key selling points...'
              className='peer min-h-28 w-full pl-9'
            />
          </div>
        </Field>

        <FieldGroup className='flex flex-col gap-6! md:max-lg:col-span-2'>
          <Field className='gap-2'>
            <FieldLabel htmlFor='multi-step-deal-details-offered-items'>Product Category</FieldLabel>
            <Select items={categoryItems}>
              <SelectTrigger id='multi-step-deal-details-offered-items' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field className='gap-2'>
            <FieldLabel htmlFor='multi-step-deal-details-card-condition'>Warranty Period</FieldLabel>
            <Select items={warrantyItems}>
              <SelectTrigger id='multi-step-deal-details-card-condition' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {warrantyItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <Field className='gap-2 md:max-lg:col-span-2'>
          <FieldLabel htmlFor='multi-step-deal-details-duration'>Availability Period</FieldLabel>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant='outline'
                  id='multi-step-deal-details-duration'
                  className='w-full justify-between font-normal'
                />
              }
            >
              {range?.from && range?.to
                ? `${range.from.toLocaleDateString('en-CA')} to ${range.to.toLocaleDateString('en-CA')}`
                : 'YYYY-MM-DD to YYYY-MM-DD'}
              <IconPlaceholder
                lucide='ChevronDownIcon'
                tabler='IconChevronDown'
                hugeicons='ArrowDown01Icon'
                phosphor='CaretDownIcon'
                remixicon='RiArrowDownSLine'
              />
            </PopoverTrigger>
            <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
              <Calendar
                mode='range'
                selected={range}
                onSelect={range => {
                  setRange(range)
                }}
              />
            </PopoverContent>
          </Popover>
        </Field>

        <Field className='gap-2 md:max-lg:col-span-2'>
          <FieldLabel className='font-medium'>Marketing Channels</FieldLabel>
          <div className='flex size-full flex-wrap items-center gap-x-6 gap-y-2'>
            {['Website', 'Mobile App', 'Social Media'].map(label => (
              <Field key={label} orientation='horizontal' className='w-fit'>
                <Checkbox id={label} />
                <FieldLabel htmlFor={label} className='font-normal'>
                  {label}
                </FieldLabel>
              </Field>
            ))}
          </div>
        </Field>
      </FieldGroup>

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
        <Button size='lg' onClick={() => stepper.navigation.next()}>
          Next
          <IconPlaceholder
            lucide='ArrowRightIcon'
            tabler='IconArrowRight'
            hugeicons='ArrowRight02Icon'
            phosphor='ArrowRightIcon'
            remixicon='RiArrowRightLine'
          />
        </Button>
      </div>
    </CardContent>
  )
}

export default ProductDetailsStep
