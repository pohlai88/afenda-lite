/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { deserialize } from "../wire/deserialize";
import { serialize } from "../wire/serialize";

export const errorWire = Object.freeze({ deserialize, serialize });
