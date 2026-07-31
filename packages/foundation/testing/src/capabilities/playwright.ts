/**
 * @afenda/testing
 * Contract: TESTING-CAPABILITY-PLAYWRIGHT
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { defineAfendaPlaywrightConfig } from "#testing/define-playwright-config";

export const testingPlaywright = Object.freeze({
	define: defineAfendaPlaywrightConfig,
});
