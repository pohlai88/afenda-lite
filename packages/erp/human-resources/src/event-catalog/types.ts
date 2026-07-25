import type { ZodType } from "zod";

export type HumanResourcesEventCatalogOwnerPackage = "@afenda/human-resources";

export type EventCatalogProjection =
	| {
			mode: "projected";
			projectionOwner: string;
	  }
	| {
			mode: "notification";
			notificationOwner: string;
	  }
	| {
			mode: "integration";
			integrationOwner: string;
	  }
	| {
			mode: "documented_no_consumer";
			reason: string;
	  };

export interface EventCatalogEntry {
	eventType: string;
	version: number;
	ownerPackage: HumanResourcesEventCatalogOwnerPackage;
	schema: ZodType;
	consumers: readonly string[];
	projection: EventCatalogProjection;
}
