export type SelfServicePermissions = {
	canRecordAttendance: boolean;
	canCancelApprovedLeave: boolean;
	canSubmitTimesheet: boolean;
	canAcknowledgePolicy: boolean;
};

export type SelfServiceSnapshot = {
	profile: {
		name: string;
		preferredName: string | null;
		employeeNumber: string;
		employmentStatus: string | null;
		workerStatus: string | null;
		phone: string | null;
	} | null;
	leaveBalances: Array<{
		entitlementId: string;
		policyName: string;
		balance: string;
		unit: string;
		periodStart: string;
		periodEnd: string;
	}>;
	leaveRequests: Array<{
		id: string;
		policyName: string;
		startDate: string;
		endDate: string;
		quantity: string;
		unit: string;
		status: string;
		version: number;
		updatedAt: string;
	}>;
	attendance: {
		currentStatus: string;
		events: Array<{
			id: string;
			type: string;
			occurredAt: string;
			localWorkDate: string;
			source: string;
			voided: boolean;
		}>;
		sessions: Array<{
			id: string;
			localWorkDate: string;
			firstClockInAt: string | null;
			finalClockOutAt: string | null;
			workedMinutes: number;
			breakMinutes: number;
			status: string;
		}>;
	};
	timesheet: {
		id: string;
		periodStart: string;
		periodEnd: string;
		status: string;
		version: number;
		recordedMinutes: number;
		approvedMinutes: number;
		entries: Array<{
			id: string;
			workDate: string;
			timeType: string;
			recordedMinutes: number;
			approvedMinutes: number;
		}>;
	} | null;
	learning: {
		assignments: Array<{
			id: string;
			course: string;
			dueOn: string | null;
			status: string;
		}>;
		certifications: Array<{
			id: string;
			course: string;
			code: string;
			issuedOn: string;
			expiresOn: string | null;
			status: string;
		}>;
	};
	performance: {
		goals: Array<{
			id: string;
			title: string;
			periodStart: string;
			periodEnd: string;
			status: string;
		}>;
		reviews: Array<{
			id: string;
			status: string;
			rating: string | null;
			updatedAt: string;
		}>;
	};
	compliance: {
		summary: {
			missingDocuments: number;
			expiringDocuments: number;
			workEligibilityAtRisk: boolean;
			outstandingAcknowledgements: number;
		} | null;
		documents: Array<{
			id: string;
			type: string;
			issuedOn: string;
			expiresOn: string | null;
			status: string;
		}>;
		acknowledgements: Array<{
			id: string;
			policyCode: string;
			policyVersion: string;
			dueOn: string;
			version: number;
		}>;
	};
	errors: Partial<Record<"profile" | "leave" | "attendance" | "timesheet" | "learning" | "performance" | "compliance", string>>;
};
