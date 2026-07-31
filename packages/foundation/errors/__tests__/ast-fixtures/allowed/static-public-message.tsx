/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { errorResult } from "../../../src/index";

export const allowedTsxStaticMessage = errorResult.fail("BAD_REQUEST", {
	publicMessage: "The TSX request could not be processed",
});
