import { Empty } from "@afenda/ui-system";

export function CorporateAdministrationEmptyState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return <Empty title={title} description={description} size="sm" />;
}
