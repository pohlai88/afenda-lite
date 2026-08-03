/**
 * @afenda/env
 * Contract: ENV-EXPORTS
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Public entrypoint: `@afenda/env` — the product runtime configuration only.
 *
 * Importing this module initializes and validates the product environment
 * schema. That side effect is intentional and confined here: pure evaluators
 * live behind `@afenda/env/contract`, `/performance`, and `/recovery` so that
 * scripts, tests, and tooling can use them without requiring product
 * environment variables to be present.
 *
 * Do not re-export the posture or contract evaluators from this entrypoint.
 * Doing so would make every consumer of a pure evaluator pay for full product
 * environment validation — the coupling this split exists to remove.
 */

export {
	env,
	isDevelopmentRuntimeNow,
	isProductionDeploymentNow,
	isVercelRuntimeNow,
} from "./web";
