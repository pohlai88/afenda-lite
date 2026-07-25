import { Alert, AlertDescription, AlertTitle } from "@afenda/ui-system";

import type { ActionResult } from "@/modules/platform/schemas/action-result";

export function CorporateAdministrationErrorState<T>({
	state,
	title,
}: {
	state: ActionResult<T> | null;
	title: string;
}) {
	if (!state || state.ok) return null;
	return (
		<Alert variant="destructive">
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{state.message}</AlertDescription>
		</Alert>
	);
}
