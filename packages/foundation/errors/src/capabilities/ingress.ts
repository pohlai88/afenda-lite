/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { code } from "../ingress/code";
import { postgres } from "../ingress/postgres";
import { unknown } from "../ingress/unknown";

export const errorIngress = Object.freeze({ code, postgres, unknown });
