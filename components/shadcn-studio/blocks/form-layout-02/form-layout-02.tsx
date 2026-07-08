import { MailIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const visibilityItems = [
  { label: 'Public - Anyone can view', value: 'public' },
  { label: 'Private - Only team members', value: 'private' }
]

const FormLayout = () => {
  return (
    <form>
      {/* Personal Information */}
      <FieldSet className='grid grid-cols-1 gap-10 md:grid-cols-3'>
        <div>
          <FieldLegend className='mb-1.5 font-semibold'>Personal Information</FieldLegend>
          <FieldDescription>Enter your contact details and address information.</FieldDescription>
        </div>

        <FieldGroup className='grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2'>
          <Field className='gap-2'>
            <FieldLabel htmlFor='first-name'>First Name</FieldLabel>
            <Input id='first-name' placeholder='John' />
            <FieldDescription className='text-xs'>Your legal first name</FieldDescription>
          </Field>

          <Field className='gap-2'>
            <FieldLabel htmlFor='last-name'>Last Name</FieldLabel>
            <Input id='last-name' placeholder='Doe' />
            <FieldDescription className='text-xs'>Your legal last name</FieldDescription>
          </Field>

          <Field className='gap-2 sm:col-span-2'>
            <FieldLabel htmlFor='email'>Email Address</FieldLabel>
            <InputGroup>
              <InputGroupInput id='email' type='email' placeholder='Email address' />
              <InputGroupAddon align='inline-end'>
                <MailIcon className='size-4' aria-hidden='true' />
                <span className='sr-only'>Email</span>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription className='text-xs'>We&apos;ll never share your email with anyone else</FieldDescription>
          </Field>

          <Field className='gap-2'>
            <FieldLabel htmlFor='mobile'>Mobile</FieldLabel>
            <Input id='mobile' type='tel' placeholder='+1 (555) 123-4567' />
            <FieldDescription className='text-xs'>Include country code for international numbers</FieldDescription>
          </Field>

          <Field className='gap-2'>
            <FieldLabel htmlFor='pincode'>Pincode</FieldLabel>
            <Input id='pincode' placeholder='10001' />
            <FieldDescription className='text-xs'>5-digit postal code</FieldDescription>
          </Field>

          <Field className='gap-2 sm:col-span-2'>
            <FieldLabel htmlFor='address'>Address</FieldLabel>
            <Input id='address' placeholder='123 Main St, Apt 4B' />
            <FieldDescription className='text-xs'>Street address with apartment or suite number</FieldDescription>
          </Field>

          <Field className='gap-2 sm:col-span-2'>
            <FieldLabel htmlFor='landmark'>Landmark</FieldLabel>
            <Input id='landmark' placeholder='Near Central Park' />
            <FieldDescription className='text-xs'>Optional nearby landmark for easier location</FieldDescription>
          </Field>

          <Field className='gap-2'>
            <FieldLabel htmlFor='city'>City</FieldLabel>
            <Input id='city' placeholder='New York' />
          </Field>

          <Field className='gap-2'>
            <FieldLabel htmlFor='state'>State</FieldLabel>
            <Input id='state' placeholder='NY' />
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className='my-10' />

      {/* Workspace Setting */}
      <FieldSet className='grid grid-cols-1 gap-10 md:grid-cols-3'>
        <div>
          <FieldLegend className='mb-1.5 font-semibold'>Workspace Settings</FieldLegend>
          <FieldDescription>Configure your workspace preferences and visibility options.</FieldDescription>
        </div>

        <FieldGroup className='grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2'>
          <Field className='gap-2'>
            <FieldLabel htmlFor='workspace-name'>Workspace Name</FieldLabel>
            <Input id='workspace-name' placeholder='My Workspace' />
            <FieldDescription className='text-xs'>Choose a unique name for your workspace</FieldDescription>
          </Field>

          <Field className='gap-2'>
            <FieldLabel htmlFor='visibility'>Visibility</FieldLabel>
            <Select defaultValue='public' items={visibilityItems}>
              <SelectTrigger id='visibility' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {visibilityItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription className='text-xs'>Control who can access your workspace</FieldDescription>
          </Field>

          <Field className='gap-2 sm:col-span-2'>
            <FieldLabel htmlFor='workspace-description'>Workspace Description</FieldLabel>
            <Textarea placeholder='Describe your workspace purpose and goals...' id='workspace-description' rows={4} />
            <FieldDescription className='text-xs'>
              This description is for internal use and won&apos;t be displayed publicly.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className='my-10' />

      {/* Notification Setting */}
      <FieldSet className='grid grid-cols-1 gap-10 md:grid-cols-3'>
        <div>
          <FieldLegend className='mb-1.5 font-semibold'>Notification Settings</FieldLegend>
          <FieldDescription>Choose how you want to receive notifications and updates.</FieldDescription>
        </div>

        <div className='grid grid-cols-1 gap-6 md:col-span-2 lg:grid-cols-2'>
          <FieldSet className='gap-4'>
            <FieldLegend className='mb-1.5' variant='legend'>
              Email Notifications
            </FieldLegend>
            <FieldDescription>Select which emails you&apos;d like to receive.</FieldDescription>
            <FieldGroup className='gap-2'>
              <Field orientation='horizontal' className='items-center'>
                <Checkbox id='marketing' />
                <FieldLabel htmlFor='marketing' className='font-normal'>
                  Marketing and promotional emails
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='items-center'>
                <Checkbox id='updates' defaultChecked />
                <FieldLabel htmlFor='updates' className='font-normal'>
                  Product updates and announcements
                </FieldLabel>
              </Field>
              <Field orientation='horizontal'>
                <Checkbox id='security' defaultChecked />
                <FieldLabel htmlFor='security' className='font-normal'>
                  Security alerts and notifications
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='items-center'>
                <Checkbox id='digest' />
                <FieldLabel htmlFor='digest' className='font-normal'>
                  Weekly digest of activity
                </FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet className='gap-4'>
            <FieldLegend className='mb-1.5' variant='legend'>
              Notification Frequency
            </FieldLegend>
            <FieldDescription>How often would you like to receive notifications?</FieldDescription>
            <RadioGroup defaultValue='realtime'>
              <FieldGroup className='gap-2'>
                <Field orientation='horizontal'>
                  <RadioGroupItem value='realtime' id='realtime' />
                  <FieldLabel htmlFor='realtime' className='font-normal'>
                    Real-time notifications
                  </FieldLabel>
                </Field>
                <Field orientation='horizontal'>
                  <RadioGroupItem value='daily' id='daily' />
                  <FieldLabel htmlFor='daily' className='font-normal'>
                    Daily digest
                  </FieldLabel>
                </Field>
                <Field orientation='horizontal'>
                  <RadioGroupItem value='weekly' id='weekly' />
                  <FieldLabel htmlFor='weekly' className='font-normal'>
                    Weekly digest
                  </FieldLabel>
                </Field>
                <Field orientation='horizontal'>
                  <RadioGroupItem value='never' id='never' />
                  <FieldLabel htmlFor='never' className='font-normal'>
                    Never
                  </FieldLabel>
                </Field>
              </FieldGroup>
            </RadioGroup>
          </FieldSet>
        </div>
      </FieldSet>

      <Separator className='my-10' />

      <div className='flex justify-end gap-3'>
        <Button type='button' variant='outline' className='w-full sm:w-auto'>
          Cancel
        </Button>
        <Button type='submit' className='w-full sm:w-auto'>
          Save Changes
        </Button>
      </div>
    </form>
  )
}

export default FormLayout
