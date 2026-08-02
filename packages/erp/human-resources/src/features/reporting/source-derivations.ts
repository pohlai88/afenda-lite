export function deriveLearningDates(input: {
	assignmentId: string;
	completions: readonly {
		id: string;
		assignmentId: string;
		completedAt: Date;
	}[];
	certifications: readonly { completionId: string; expiresOn: string | null }[];
}): { completedOn: string | null; certificationExpiresOn: string | null } {
	const completion = input.completions.find(
		(row) => row.assignmentId === input.assignmentId,
	);
	if (completion === undefined) {
		return { completedOn: null, certificationExpiresOn: null };
	}
	const certification = input.certifications.find(
		(row) => row.completionId === completion.id,
	);
	return {
		completedOn: completion.completedAt.toISOString().slice(0, 10),
		certificationExpiresOn: certification?.expiresOn ?? null,
	};
}

export function countActiveReportingGoals(
	employeeId: string,
	goals: readonly { employeeId: string; status: string }[],
): number {
	return goals.filter(
		(goal) => goal.employeeId === employeeId && goal.status === "active",
	).length;
}

export function selectLatestSuccessionReadiness<
	Candidate extends { readinessEffectiveOn: string },
>(candidates: readonly Candidate[]): Candidate | undefined {
	return candidates.reduce<Candidate | undefined>(
		(latest, candidate) =>
			latest === undefined ||
			latest.readinessEffectiveOn < candidate.readinessEffectiveOn
				? candidate
				: latest,
		undefined,
	);
}

export function deriveWorkforceActuals(input: {
	asOf: string;
	line: { positionId: string | null; departmentId: string | null };
	assignments: readonly {
		employeeId: string;
		positionId: string;
		departmentId: string | null;
		assignmentStartsOn: string;
		assignmentEndsOn: string | null;
		employmentStartsOn: string;
		employmentEndsOn: string | null;
	}[];
}): { actualHeadcount: number; actualFullTimeEquivalent: string } {
	const actuals = input.assignments.filter(
		(row) =>
			row.assignmentStartsOn <= input.asOf &&
			(row.assignmentEndsOn === null || row.assignmentEndsOn >= input.asOf) &&
			row.employmentStartsOn <= input.asOf &&
			(row.employmentEndsOn === null || row.employmentEndsOn >= input.asOf) &&
			(input.line.positionId === null ||
				row.positionId === input.line.positionId) &&
			(input.line.departmentId === null ||
				row.departmentId === input.line.departmentId),
	);
	return {
		actualHeadcount: new Set(actuals.map((row) => row.employeeId)).size,
		actualFullTimeEquivalent: `${actuals.length}.0000`,
	};
}
