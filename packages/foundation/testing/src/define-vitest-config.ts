/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { ViteUserConfig } from "vitest/config";

import { getTestingLane, type TestingLaneId } from "#testing/lanes";

const LEADING_DOT_SLASH_PATTERN = /^\.\//;
const TRAILING_SLASH_PATTERN = /\/$/;

export type DefineAfendaVitestConfigOptions = Readonly<{
	lane: TestingLaneId;
	environment?: "node" | "jsdom";
	setupFiles?: readonly string[];
	globalSetup?: readonly string[];
	coverage?: boolean;
}>;

export type ResolveVitestLanePatternsOptions = Readonly<{
	lane: TestingLaneId;
	projectPath?: string;
}>;

function normalizePatternPath(pattern: string): string {
	return pattern.replaceAll("\\", "/").replace(LEADING_DOT_SLASH_PATTERN, "");
}

export function resolveVitestLaneInclude(
	options: ResolveVitestLanePatternsOptions,
): string[] {
	const lane = getTestingLane(options.lane);
	const projectPath = options.projectPath
		? `${normalizePatternPath(options.projectPath).replace(TRAILING_SLASH_PATTERN, "")}/`
		: undefined;

	return lane.include.map((pattern) => {
		const normalizedPattern = normalizePatternPath(pattern);

		if (normalizedPattern.startsWith("<workspace>/")) {
			return normalizedPattern.replace("<workspace>/", "");
		}

		if (projectPath && normalizedPattern.startsWith(projectPath)) {
			return normalizedPattern.slice(projectPath.length);
		}

		return normalizedPattern;
	});
}

export function resolveVitestLaneExclude(
	options: ResolveVitestLanePatternsOptions,
): string[] | undefined {
	const lane = getTestingLane(options.lane);

	return lane.exclude?.map(normalizePatternPath);
}

export function defineAfendaVitestConfig(
	options: DefineAfendaVitestConfigOptions,
) {
	const lane = getTestingLane(options.lane);

	if (lane.runner !== "vitest") {
		throw new Error(`Testing lane "${lane.id}" is not a Vitest lane.`);
	}
	const exclude = resolveVitestLaneExclude({ lane: options.lane });
	const hookTimeout = lane.hookTimeoutMs ?? lane.timeoutMs;

	return {
		test: {
			name: lane.id,
			include: resolveVitestLaneInclude({ lane: options.lane }),
			...(exclude === undefined ? {} : { exclude }),
			environment: options.environment ?? "node",
			...(options.setupFiles ? { setupFiles: [...options.setupFiles] } : {}),
			...(options.globalSetup ? { globalSetup: [...options.globalSetup] } : {}),
			...(lane.timeoutMs === undefined ? {} : { testTimeout: lane.timeoutMs }),
			...(hookTimeout === undefined ? {} : { hookTimeout }),
			passWithNoTests: false,
			...(options.coverage
				? {
						coverage: {
							enabled: true,
							provider: "v8",
						},
					}
				: {}),
		},
	} satisfies ViteUserConfig;
}
