/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { deserialize } from "../wire/deserialize";
import { serialize } from "../wire/serialize";

export const errorWire = Object.freeze({ deserialize, serialize });
