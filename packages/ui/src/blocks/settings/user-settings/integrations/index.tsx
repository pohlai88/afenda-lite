// Component Imports
import { Separator } from "../../../../components/ui/separator";

import type { IntegrationsData } from "../../../../contracts/pages/user-settings-types";

import Communication from "./integrations-communication";
import Planning from "./integrations-planning";
import Tools from "./integrations-tools";

type IntegrationsProps = {
	integrationsData: IntegrationsData;
};

const Integrations = ({ integrationsData }: IntegrationsProps) => {
	return (
		<section className="py-3">
			<Communication apps={integrationsData.communication} />
			<Separator className="my-10" />
			<Planning apps={integrationsData.planning} />
			<Separator className="my-10" />
			<Tools apps={integrationsData.tools} />
		</section>
	);
};

export default Integrations;
