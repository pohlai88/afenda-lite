/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { code } from "../ingress/code";
import { postgres } from "../ingress/postgres";
import { unknown } from "../ingress/unknown";

export const errorIngress = Object.freeze({ code, postgres, unknown });
