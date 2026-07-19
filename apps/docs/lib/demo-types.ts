/**
 * Sample types for AutoTypeTable demos in narrative MDX.
 * Annotations: docs-V2/docs/typescript.md
 */
export type DocsProjectRule = {
	readonly name: string;
	readonly enforced: boolean;
	readonly notes?: string;
	/**
	 * Hidden from AutoTypeTable via @internal.
	 *
	 * @internal
	 */
	readonly cacheKey?: string;
	/**
	 * Simplified type label in the table.
	 *
	 * @remarks `timestamp` ISO time when the rule was last reviewed.
	 */
	readonly reviewedAt?: number;
};
