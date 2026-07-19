import {
	createFileSystemGeneratorCache,
	createGenerator,
} from "fumadocs-typescript";

/**
 * AutoTypeTable generator (UI integration) — docs-V2/docs/typescript.md
 * Remark MDX plugin path is Outside baseline (UI only).
 */
export const docsTypeGenerator = createGenerator({
	tsconfigPath: "./tsconfig.json",
	cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});
