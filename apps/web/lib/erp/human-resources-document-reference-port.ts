import {
	createVaultDocumentReferenceAdapter,
	type DocumentObjectResolverPort,
	type DocumentReferencePort,
} from "@afenda/human-resources";

/**
 * Composition root for tenant-bound, versioned vault references. HR never
 * becomes the owner of binary storage or e-signature lifecycle state.
 */
export function createHumanResourcesDocumentReferencePort(
	resolver?: DocumentObjectResolverPort,
): DocumentReferencePort {
	return createVaultDocumentReferenceAdapter(
		resolver === undefined ? {} : { resolver },
	);
}
