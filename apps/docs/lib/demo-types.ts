/**
 * Sample types for AutoTypeTable demos in narrative MDX.
 * Annotations: docs-V2/docs/typescript.md
 */
export type DocsProjectRule = {
	/**
	 * Hidden from AutoTypeTable via @internal.
	 *
	 * @internal
	 */
	readonly cacheKey?: string;
	readonly enforced: boolean;
	readonly name: string;
	readonly notes?: string;
	/**
	 * Simplified type label in the table.
	 *
	 * @remarks `timestamp` ISO time when the rule was last reviewed.
	 */
	readonly reviewedAt?: number;
};
