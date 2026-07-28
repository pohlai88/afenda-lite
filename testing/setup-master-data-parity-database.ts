/** Master-data parity is a release gate: missing DATABASE_URL is BLOCKED, never skipped. */
import { resolveDatabaseUrlForTests } from "../packages/foundation/testing/src/require-database-for-ci.ts";

process.env.REQUIRE_DATABASE_TESTS = "1";
resolveDatabaseUrlForTests();
