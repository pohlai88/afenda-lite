export type HrObservabilityArea =
	| "workforce"
	| "compensation"
	| "leave"
	| "time"
	| "talent"
	| "compliance"
	| "privacy"
	| "bulk"
	| "payroll_delivery"
	| "integration";

export type HrOutcome = "success" | "failure";
export type HrFailureReason =
	| "validation"
	| "authorization"
	| "conflict"
	| "not_found"
	| "persistence"
	| "timeout"
	| "unavailable"
	| "contract"
	| "unknown";
export type HrAuthorizationReason =
	| "permission_missing"
	| "tenant_mismatch"
	| "sensitive_scope_missing"
	| "policy_denied";
export type HrPrivacyOperation = "access" | "export" | "erase" | "rectify";
export type HrEventFamily =
	| "domain_event"
	| "audit_event"
	| "payroll_handoff"
	| "integration_event";
export type HrParityAdapter = "memory" | "drizzle";
export type HrConnector =
	| "payroll"
	| "benefits"
	| "identity"
	| "documents"
	| "notifications"
	| "search";
export type HrConnectorHealth = "healthy" | "degraded" | "unavailable";
export type HrBulkStage = "parse" | "validate" | "apply" | "commit";
export type HrPayrollDeliveryStage =
	| "queue"
	| "publish"
	| "feedback"
	| "correction";

export type HrMetricObservation =
	| {
			name: "hr.command.total";
			kind: "counter";
			value: 1;
			labels: { area: HrObservabilityArea; outcome: HrOutcome };
	  }
	| {
			name: "hr.command.duration_ms";
			kind: "histogram";
			value: number;
			labels: { area: HrObservabilityArea; outcome: HrOutcome };
	  }
	| {
			name: "hr.authorization.denial.total";
			kind: "counter";
			value: 1;
			labels: { area: HrObservabilityArea; reason: HrAuthorizationReason };
	  }
	| {
			name: "hr.privacy.operation.total";
			kind: "counter";
			value: 1;
			labels: { operation: HrPrivacyOperation; outcome: HrOutcome };
	  }
	| {
			name: "hr.outbox.lag_ms";
			kind: "gauge";
			value: number;
			labels: { eventFamily: HrEventFamily };
	  }
	| {
			name: "hr.event.failure.total";
			kind: "counter";
			value: 1;
			labels: { eventFamily: HrEventFamily; reason: HrFailureReason };
	  }
	| {
			name: "hr.parity.failure.total";
			kind: "counter";
			value: 1;
			labels: { area: HrObservabilityArea; adapter: HrParityAdapter };
	  }
	| {
			name: "hr.connector.health";
			kind: "gauge";
			value: 0 | 0.5 | 1;
			labels: { connector: HrConnector };
	  }
	| {
			name: "hr.bulk.error.total";
			kind: "counter";
			value: 1;
			labels: { stage: HrBulkStage; reason: HrFailureReason };
	  }
	| {
			name: "hr.payroll_delivery.failure.total";
			kind: "counter";
			value: 1;
			labels: { stage: HrPayrollDeliveryStage; reason: HrFailureReason };
	  };

export type HrObservabilityEvent =
	| {
			name: "hr.command.failed";
			severity: "error";
			observedAt: Date;
			attributes: { area: HrObservabilityArea; reason: HrFailureReason };
	  }
	| {
			name: "hr.authorization.denied";
			severity: "warning";
			observedAt: Date;
			attributes: {
				area: HrObservabilityArea;
				reason: HrAuthorizationReason;
			};
	  }
	| {
			name: "hr.privacy.operation.failed";
			severity: "error";
			observedAt: Date;
			attributes: { operation: HrPrivacyOperation; reason: HrFailureReason };
	  }
	| {
			name: "hr.event.failed";
			severity: "error";
			observedAt: Date;
			attributes: { eventFamily: HrEventFamily; reason: HrFailureReason };
	  }
	| {
			name: "hr.parity.failed";
			severity: "error";
			observedAt: Date;
			attributes: { area: HrObservabilityArea; adapter: HrParityAdapter };
	  }
	| {
			name: "hr.connector.unhealthy";
			severity: "warning" | "error";
			observedAt: Date;
			attributes: {
				connector: HrConnector;
				health: Exclude<HrConnectorHealth, "healthy">;
			};
	  }
	| {
			name: "hr.bulk.failed";
			severity: "error";
			observedAt: Date;
			attributes: { stage: HrBulkStage; reason: HrFailureReason };
	  }
	| {
			name: "hr.payroll_delivery.failed";
			severity: "error";
			observedAt: Date;
			attributes: { stage: HrPayrollDeliveryStage; reason: HrFailureReason };
	  };
