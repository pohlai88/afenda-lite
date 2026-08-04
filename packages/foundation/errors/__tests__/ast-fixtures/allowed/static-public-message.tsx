/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { errorResult } from "../../../src/index";

export const allowedTsxStaticMessage = errorResult.fail("BAD_REQUEST", {
	publicMessage: "The TSX request could not be processed",
});
