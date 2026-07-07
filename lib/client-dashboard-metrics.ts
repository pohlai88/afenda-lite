import type { ClientAssignment } from "@/lib/clients";

const DUE_SOON_DAYS = 7;

export type ClientDashboardMetrics = {
  pending: number;
  submitted: number;
  dueSoon: number;
};

export function computeClientDashboardMetrics(
  assignments: ClientAssignment[],
): ClientDashboardMetrics {
  const now = new Date();
  const dueSoonThreshold = new Date(now);
  dueSoonThreshold.setDate(dueSoonThreshold.getDate() + DUE_SOON_DAYS);

  let pending = 0;
  let submitted = 0;
  let dueSoon = 0;

  for (const assignment of assignments) {
    if (assignment.status === "submitted") {
      submitted += 1;
      continue;
    }

    pending += 1;
    if (
      assignment.dueDate &&
      assignment.dueDate >= now &&
      assignment.dueDate <= dueSoonThreshold
    ) {
      dueSoon += 1;
    }
  }

  return { pending, submitted, dueSoon };
}

export function assignmentDueUrgency(
  assignment: ClientAssignment,
): "overdue" | "due_soon" | null {
  if (assignment.status === "submitted" || !assignment.dueDate) {
    return null;
  }

  const now = new Date();
  const dueSoonThreshold = new Date(now);
  dueSoonThreshold.setDate(dueSoonThreshold.getDate() + DUE_SOON_DAYS);

  if (assignment.dueDate < now) {
    return "overdue";
  }

  if (assignment.dueDate <= dueSoonThreshold) {
    return "due_soon";
  }

  return null;
}
