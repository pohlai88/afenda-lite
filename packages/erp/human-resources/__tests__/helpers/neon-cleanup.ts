import {
	db,
	eq,
	hrDepartment,
	hrEmployee,
	hrEmployment,
	hrEmploymentContract,
	hrJob,
	hrPosition,
	hrReportingLine,
	hrWorkAssignment,
	platformAuditLog,
	platformDomainEvent,
} from "@afenda/db";

/** Wipe synthetic-org HR fixtures and co-written audit / domain-event rows. */
export async function cleanupHumanResourcesNeonOrgs(
	organizationIds: readonly string[],
): Promise<void> {
	for (const organizationId of organizationIds) {
		await db
			.delete(hrWorkAssignment)
			.where(eq(hrWorkAssignment.organizationId, organizationId));
		await db
			.delete(hrReportingLine)
			.where(eq(hrReportingLine.organizationId, organizationId));
		await db
			.delete(hrEmploymentContract)
			.where(eq(hrEmploymentContract.organizationId, organizationId));
		await db
			.delete(hrEmployment)
			.where(eq(hrEmployment.organizationId, organizationId));
		await db
			.delete(hrPosition)
			.where(eq(hrPosition.organizationId, organizationId));
		await db
			.update(hrDepartment)
			.set({ parentDepartmentId: null })
			.where(eq(hrDepartment.organizationId, organizationId));
		await db
			.delete(hrDepartment)
			.where(eq(hrDepartment.organizationId, organizationId));
		await db.delete(hrJob).where(eq(hrJob.organizationId, organizationId));
		await db
			.delete(hrEmployee)
			.where(eq(hrEmployee.organizationId, organizationId));
		await db
			.delete(platformAuditLog)
			.where(eq(platformAuditLog.organizationId, organizationId));
		await db
			.delete(platformDomainEvent)
			.where(eq(platformDomainEvent.organizationId, organizationId));
	}
}
