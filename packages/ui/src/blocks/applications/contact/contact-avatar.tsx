// Type imports

// Component imports
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "../../../components/ui/avatar";
import type { Contact } from "../../../contracts/applications/contact-types";
import { getContactInitials } from "../../../lib/contact-utils";
// Utils imports
import { cn } from "../../../lib/utils";

type ContactAvatarProps = {
	contact: Pick<Contact, "firstName" | "lastName" | "image">;
	className?: string;
};

const ContactAvatar = ({ contact, className }: ContactAvatarProps) => {
	return (
		<Avatar className={cn("size-10 shrink-0", className)}>
			{contact.image && (
				<AvatarImage
					src={contact.image}
					alt={`${contact.firstName} ${contact.lastName}`}
				/>
			)}
			<AvatarFallback>
				{getContactInitials(contact.firstName, contact.lastName)}
			</AvatarFallback>
		</Avatar>
	);
};

export default ContactAvatar;
