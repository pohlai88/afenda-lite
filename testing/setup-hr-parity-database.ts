/**
 * HR parity Vitest project setup — resolve DATABASE_URL before suite modules load.
 * Fail-closed under CI / REQUIRE_DATABASE_TESTS=1.
 *
 * Relative import: this file lives outside a workspace package that declares
 * `@afenda/testing` (vitest config root cannot resolve that export alone).
 */
import { resolveDatabaseUrlForTests } from "../packages/foundation/testing/src/require-database-for-ci.ts";

resolveDatabaseUrlForTests();
