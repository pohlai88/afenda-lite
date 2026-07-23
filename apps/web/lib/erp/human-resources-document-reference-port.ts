import {
	createVaultDocumentReferenceAdapter,
	type DocumentReferencePort,
} from "@afenda/human-resources";

/**
 * Composition-root vault:// reference validator.
 * Existence / malware / retention checks attach later via DocumentObjectResolverPort.
 */
export function createHumanResourcesDocumentReferencePort(): DocumentReferencePort {
	return createVaultDocumentReferenceAdapter();
}
