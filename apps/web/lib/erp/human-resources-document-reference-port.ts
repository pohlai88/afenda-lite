import {
	createVaultDocumentReferenceAdapter,
	type DocumentReferencePort,
} from "@afenda/human-resources";

/**
 * Composition root for tenant-bound, versioned vault references. HR never
 * becomes the owner of binary storage or e-signature lifecycle state.
 */
export function createHumanResourcesDocumentReferencePort(): DocumentReferencePort {
	return createVaultDocumentReferenceAdapter();
}
