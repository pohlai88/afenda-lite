// Component Imports
import { Separator } from "../../../../components/ui/separator";

// Component Imports
import ConnectAccount from "./connect-account";
import DangerZone from "./danger-zone";
import EmailPass from "./email-password";
import PersonalInfo from "./personal-info";
import SocialUrl from "./social-url";

const UserGeneral = () => {
	return (
		<section className="py-3">
			<PersonalInfo />
			<Separator className="my-10" />
			<EmailPass />
			<Separator className="my-10" />
			<ConnectAccount />
			<Separator className="my-10" />
			<SocialUrl />
			<Separator className="my-10" />
			<DangerZone />
		</section>
	);
};

export default UserGeneral;
