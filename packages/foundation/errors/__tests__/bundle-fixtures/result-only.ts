/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { errorResult } from "@afenda/errors";

export const bundleFixtureResult = errorResult.fail("NOT_FOUND", {
	publicMessage: "The requested record could not be found",
});
