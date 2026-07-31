/**
 * @afenda/testing
 * Contract: TESTING-CAPABILITY-VITEST
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	defineAfendaVitestConfig,
	resolveVitestLaneExclude,
	resolveVitestLaneInclude,
} from "#testing/define-vitest-config";

export const testingVitest = Object.freeze({
	define: defineAfendaVitestConfig,
	include: resolveVitestLaneInclude,
	exclude: resolveVitestLaneExclude,
});
