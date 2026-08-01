import {
	createHumanResourcesIdentityResolverCapability,
	type HumanResourcesIdentityResolverCapability,
} from "@afenda/human-resources";

export function createHumanResourcesIdentityResolverPort(): HumanResourcesIdentityResolverCapability {
	return createHumanResourcesIdentityResolverCapability();
}
