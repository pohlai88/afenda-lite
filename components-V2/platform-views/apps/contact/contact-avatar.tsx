// Type imports
import type { Contact } from '@/components-V2/platform-types/apps/contact-types'

// Component imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components-V2/platform-components/ui/avatar'

// Utils imports
import { cn } from '@/components-V2/lib/utils'
import { getContactInitials } from '@/components-V2/platform-utils/contact-utils'

type ContactAvatarProps = {
  contact: Pick<Contact, 'firstName' | 'lastName' | 'image'>
  className?: string
}

const ContactAvatar = ({ contact, className }: ContactAvatarProps) => {
  return (
    <Avatar className={cn('size-10 shrink-0', className)}>
      {contact.image && <AvatarImage src={contact.image} alt={`${contact.firstName} ${contact.lastName}`} />}
      <AvatarFallback>{getContactInitials(contact.firstName, contact.lastName)}</AvatarFallback>
    </Avatar>
  )
}

export default ContactAvatar
