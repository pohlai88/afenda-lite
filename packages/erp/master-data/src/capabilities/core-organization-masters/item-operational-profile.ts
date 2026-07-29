import type { ItemTrackingPolicy, ItemType } from "../../types";

export type ItemOperationalProfile = {
	trackingPolicy: ItemTrackingPolicy;
	sellable: boolean;
	purchasable: boolean;
	stocked: boolean;
	serviceIndicator: boolean;
};

export function defaultItemOperationalProfile(
	itemType: ItemType,
): ItemOperationalProfile {
	switch (itemType) {
		case "stock":
			return {
				trackingPolicy: "none",
				sellable: true,
				purchasable: true,
				stocked: true,
				serviceIndicator: false,
			};
		case "non_stock":
			return {
				trackingPolicy: "none",
				sellable: true,
				purchasable: true,
				stocked: false,
				serviceIndicator: false,
			};
		case "service":
			return {
				trackingPolicy: "none",
				sellable: true,
				purchasable: true,
				stocked: false,
				serviceIndicator: true,
			};
		case "asset_candidate":
			return {
				trackingPolicy: "none",
				sellable: false,
				purchasable: true,
				stocked: true,
				serviceIndicator: false,
			};
		case "expense":
			return {
				trackingPolicy: "none",
				sellable: false,
				purchasable: true,
				stocked: false,
				serviceIndicator: false,
			};
	}
}

export function resolveItemOperationalProfile(input: {
	itemType: ItemType;
	trackingPolicy?: ItemTrackingPolicy | undefined;
	sellable?: boolean | undefined;
	purchasable?: boolean | undefined;
	stocked?: boolean | undefined;
	serviceIndicator?: boolean | undefined;
}): ItemOperationalProfile {
	const defaults = defaultItemOperationalProfile(input.itemType);
	return {
		trackingPolicy: input.trackingPolicy ?? defaults.trackingPolicy,
		sellable: input.sellable ?? defaults.sellable,
		purchasable: input.purchasable ?? defaults.purchasable,
		stocked: input.stocked ?? defaults.stocked,
		serviceIndicator: input.serviceIndicator ?? defaults.serviceIndicator,
	};
}
