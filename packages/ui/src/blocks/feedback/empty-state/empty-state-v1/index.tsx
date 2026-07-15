// Components Imports
import EmptyStateAutomation from "./empty-state-automation";
import EmptyStateFinance from "./empty-state-finance";
import EmptyStateSale from "./empty-state-sale";
import EmptyStateStats from "./empty-state-stats";

function EmptyStateV1() {
	return (
		<div className="space-y-6">
			<EmptyStateStats />
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<EmptyStateAutomation />
				<EmptyStateFinance />
			</div>
			<EmptyStateSale />
		</div>
	);
}

export default EmptyStateV1;
