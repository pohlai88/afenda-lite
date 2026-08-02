import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function toTypeName(aggregate) {
	return aggregate
		.split("-")
		.map((s) => s[0].toUpperCase() + s.slice(1))
		.join("");
}

function hrAggregateFile(aggregate) {
	const constName = aggregate.replace(/-/g, "_").toUpperCase();
	const typeName = toTypeName(aggregate);
	return `/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_${constName} = "${aggregate}" as const;
export type HumanResources${typeName}Aggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_${constName};
`;
}

const hrFiles = {
	"core/employee.ts": "employee",
	"core/employment.ts": "employment",
	"core/assignment.ts": "assignment",
	"core/employment-contract.ts": "employment-contract",
	"organization/department.ts": "department",
	"organization/job.ts": "job",
	"organization/position.ts": "position",
	"organization/reporting-line.ts": "reporting-line",
	"recruitment/requisition.ts": "requisition",
	"recruitment/candidate.ts": "candidate",
	"recruitment/application.ts": "application",
	"recruitment/interview.ts": "interview",
	"recruitment/offer.ts": "offer",
	"lifecycle/onboarding.ts": "onboarding",
	"lifecycle/probation.ts": "probation",
	"lifecycle/confirmation.ts": "confirmation",
	"lifecycle/transfer.ts": "transfer",
	"lifecycle/termination.ts": "termination",
	"lifecycle/offboarding.ts": "offboarding",
	"time/shift.ts": "shift",
	"time/attendance-event.ts": "attendance-event",
	"time/attendance-record.ts": "attendance-record",
	"time/timesheet.ts": "timesheet",
	"time/attendance-exception.ts": "attendance-exception",
	"leave/leave-policy.ts": "leave-policy",
	"leave/entitlement.ts": "entitlement",
	"leave/leave-request.ts": "leave-request",
	"leave/leave-adjustment.ts": "leave-adjustment",
	"performance/performance-cycle.ts": "performance-cycle",
	"performance/goal.ts": "goal",
	"performance/review.ts": "review",
	"performance/improvement-plan.ts": "improvement-plan",
	"talent/competency.ts": "competency",
	"talent/talent-profile.ts": "talent-profile",
	"talent/talent-pool.ts": "talent-pool",
	"talent/succession-plan.ts": "succession-plan",
	"talent/career-plan.ts": "career-plan",
	"learning/course.ts": "course",
	"learning/learning-session.ts": "learning-session",
	"learning/learning-assignment.ts": "learning-assignment",
	"learning/completion.ts": "completion",
	"learning/certification.ts": "certification",
	"compensation-benefits/compensation-grade.ts": "compensation-grade",
	"compensation-benefits/salary-band.ts": "salary-band",
	"compensation-benefits/employee-compensation.ts": "employee-compensation",
	"compensation-benefits/benefit-plan.ts": "benefit-plan",
	"compensation-benefits/benefit-enrollment.ts": "benefit-enrollment",
	"compensation-benefits/compensation-review.ts": "compensation-review",
};

function writeAggregates(base, files, writer) {
	for (const [rel, aggregate] of Object.entries(files)) {
		const full = join(base, rel);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, writer(aggregate));
	}
}

const hrRoot = join(root, "packages/erp/human-resources/src");
writeAggregates(hrRoot, hrFiles, hrAggregateFile);

for (const pkgRoot of [hrRoot]) {
	mkdirSync(join(pkgRoot, "adapters/drizzle"), { recursive: true });
	mkdirSync(join(pkgRoot, "testing"), { recursive: true });
	const storeExport = "HumanResourcesStore";
	writeFileSync(
		join(pkgRoot, "adapters/drizzle/index.ts"),
		`export type { ${storeExport} } from "../../store";\n`,
	);
	writeFileSync(join(pkgRoot, "testing/index.ts"), "export {};\n");
}

console.log("human-resources aggregate scaffold OK");
