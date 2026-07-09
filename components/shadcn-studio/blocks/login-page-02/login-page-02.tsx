import { IconPlaceholder } from '@/components/svg/icon-placeholder'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { BorderBeam } from '@/components/ui/border-beam'

import Logo from '@/components/shadcn-studio/logo'
import AuthFullBackgroundShape from '@/components/svg/auth-full-background-shape'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-02/login-form'

const Login = () => {
  return (
    <div className='h-dvh lg:grid lg:grid-cols-6'>
      {/* Dashboard Preview */}
      <div className='max-lg:hidden lg:col-span-3 xl:col-span-4'>
        <div className='bg-muted relative z-1 flex h-full items-center justify-center px-6'>
          <div className='outline-border -outline-offset-2px relative shrink rounded-[20px] p-2.5 outline-2'>
            <img
              src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/auth/image-1.png'
              className='max-h-111 w-full rounded-lg object-contain dark:hidden'
              alt='Dashboards'
            />
            <img
              src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/auth/image-1-dark.png'
              className='hidden max-h-111 w-full rounded-lg object-contain dark:inline-block'
              alt='Dashboards'
            />

            <BorderBeam
              duration={8}
              borderWidth={2}
              size={100}
              className='from-destructive via-primary to-transparent'
            />
          </div>

          <div className='absolute -z-1'>
            <AuthFullBackgroundShape />
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className='flex h-full flex-col items-center justify-center py-10 sm:px-5 lg:col-span-3 xl:col-span-2'>
        <div className='w-full max-w-md px-6'>
          <a href='#' className='text-muted-foreground group mb-12 flex items-center gap-2 sm:mb-16 lg:mb-24'>
            <IconPlaceholder
              lucide='ChevronLeftIcon'
              tabler='IconChevronLeft'
              hugeicons='ArrowLeft01Icon'
              phosphor='CaretLeftIcon'
              remixicon='RiArrowLeftSLine'
              className='transition-transform duration-200 group-hover:-translate-x-0.5'
            />
            <p>Back to the website</p>
          </a>

          <div className='flex flex-col gap-6'>
            <Logo className='gap-3' />

            <div>
              <h2 className='mb-2 text-2xl font-semibold'>Sign in to Shadcn Studio</h2>
              <p className='text-muted-foreground'>Ship Faster and Focus on Growth.</p>
            </div>

            <p className='text-muted-foreground'>
              Login with{' '}
              <a href='#' className='text-foreground hover:underline'>
                Magic Link
              </a>
            </p>

            {/* Quick Login Buttons */}
            <div className='flex flex-wrap gap-4 sm:gap-6'>
              <Button variant='outline' className='grow'>
                Login as User
              </Button>
              <Button variant='outline' className='grow'>
                Login as Admin
              </Button>
            </div>

            {/* Form */}
            <LoginForm />

            <div className='space-y-4'>
              <p className='text-muted-foreground text-center'>
                New on our platform?{' '}
                <a href='#' className='text-foreground hover:underline'>
                  Create an account
                </a>
              </p>

              <div className='flex items-center gap-4'>
                <Separator className='flex-1' />
                <p>or</p>
                <Separator className='flex-1' />
              </div>

              <Button variant='ghost' className='w-full' render={<a href='#' />} nativeButton={false}>
                Sign in with google
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
