// Component Imports
import { Button } from "../../../../components/ui/button";
import { Separator } from "../../../../components/ui/separator";

import Notifications from "./all-notifications";
import BrowserNotification from "./browser-notification";
import DoNotDisturb from "./do-not-disturb";
import InboxPrefrence from "./inbox-preference";

const NotificationsPage = () => {
	return (
		<div>
			<Notifications />
			<Separator className="my-10" />
			<InboxPrefrence />
			<Separator className="my-10" />
			<BrowserNotification />
			<Separator className="my-10" />
			<DoNotDisturb />
			<div className="mt-6 flex justify-end">
				<Button type="submit" className="max-sm:w-full">
					Save Changes
				</Button>
			</div>
		</div>
	);
};

export default NotificationsPage;
