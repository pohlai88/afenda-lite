import { CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES } from "./classified-event-types";
import { tryGetEventCatalogEntry } from "./get-event-catalog-entry";

export interface HumanResourcesEventCatalogIssue {
	code: "missing_catalog_entry" | "orphan_catalog_entry";
	eventType?: string;
	message: string;
}

export function validateHumanResourcesEventCatalog(): HumanResourcesEventCatalogIssue[] {
	const issues: HumanResourcesEventCatalogIssue[] = [];
	const cataloged = new Set(
		CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES.filter((eventType) =>
			Boolean(tryGetEventCatalogEntry(eventType)),
		),
	);

	for (const eventType of CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES) {
		if (!cataloged.has(eventType)) {
			issues.push({
				eventType,
				code: "missing_catalog_entry",
				message: `${eventType} is classified in the emission registry but missing from HUMAN_RESOURCES_EVENT_CATALOG.`,
			});
		}
	}

	return issues;
}
