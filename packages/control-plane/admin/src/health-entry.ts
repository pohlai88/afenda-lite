import "server-only";

export { type AdminHealthCapability, adminHealth } from "./health-capability";
export type {
	HealthAggregate,
	LivenessResponse,
	ReadinessResponse,
} from "./schemas/health";
