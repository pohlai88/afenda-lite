import type { ClientAssignment } from "@/lib/clients";
import { assignmentHasDraftProgress } from "@/lib/clients";
import { getDeclarationDeadlineError } from "@/lib/declaration-deadlines";

const DUE_SOON_DAYS = 7;

export type AssignmentDeadlineFields = Pick<
  ClientAssignment,
  "status" | "dueDate" | "submitBefore"
>;

export function getEffectiveAssignmentDeadline(
  assignment: Pick<ClientAssignment, "dueDate" | "submitBefore">,
): Date | null {
  const { dueDate, submitBefore } = assignment;
  if (dueDate && submitBefore) {
    return dueDate < submitBefore ? dueDate : submitBefore;
  }
  return dueDate ?? submitBefore ?? null;
}

export type MetricTrendVariant = "positive" | "negative" | "neutral";

export type MetricTrend = {
  label: string;
  variant: MetricTrendVariant;
};

export type ClientDashboardMetrics = {
  pending: number;
  inProgress: number;
  submitted: number;
  dueSoon: number;
  total: number;
  trends: {
    pending: MetricTrend;
    inProgress: MetricTrend;
    submitted: MetricTrend;
    dueSoon: MetricTrend;
  };
};

function inProgressTrend(inProgress: number, total: number): MetricTrend {
  if (total === 0 || inProgress === 0) {
    return { label: "None in progress", variant: "neutral" };
  }
  return {
    label: `${inProgress} resumed`,
    variant: "neutral",
  };
}

function pendingTrend(pending: number, open: number, total: number): MetricTrend {
  if (total === 0) {
    return { label: "No assignments", variant: "neutral" };
  }
  if (open === 0) {
    return { label: "All complete", variant: "positive" };
  }
  const share = Math.round((pending / total) * 100);
  return {
    label: `${share}% not started`,
    variant: share >= 50 ? "negative" : "neutral",
  };
}

function submittedTrend(submitted: number, total: number): MetricTrend {
  if (total === 0) {
    return { label: "—", variant: "neutral" };
  }
  const share = Math.round((submitted / total) * 100);
  return {
    label: `${share}% complete`,
    variant: share === 100 ? "positive" : share >= 50 ? "neutral" : "negative",
  };
}

function dueSoonTrend(dueSoon: number, open: number): MetricTrend {
  if (open === 0) {
    return { label: "None pending", variant: "positive" };
  }
  if (dueSoon === 0) {
    return { label: "No deadlines soon", variant: "positive" };
  }
  return {
    label: `${dueSoon} within ${DUE_SOON_DAYS} days`,
    variant: "negative",
  };
}

export function computeClientDashboardMetrics(
  assignments: ClientAssignment[],
): ClientDashboardMetrics {
  let pending = 0;
  let inProgress = 0;
  let submitted = 0;
  let dueSoon = 0;

  for (const assignment of assignments) {
    if (assignment.status === "submitted") {
      submitted += 1;
      continue;
    }

    if (assignmentHasDraftProgress(assignment)) {
      inProgress += 1;
    } else {
      pending += 1;
    }

    if (assignmentDueUrgency(assignment) === "due_soon") {
      dueSoon += 1;
    }
  }

  const total = assignments.length;
  const open = pending + inProgress;

  return {
    pending,
    inProgress,
    submitted,
    dueSoon,
    total,
    trends: {
      pending: pendingTrend(pending, open, total),
      inProgress: inProgressTrend(inProgress, total),
      submitted: submittedTrend(submitted, total),
      dueSoon: dueSoonTrend(dueSoon, open),
    },
  };
}

export function assignmentDeadlineExpired(
  assignment: AssignmentDeadlineFields,
): "assignment" | "declaration" | null {
  if (assignment.status === "submitted") {
    return null;
  }

  return getDeclarationDeadlineError({
    dueDate: assignment.dueDate,
    submitBefore: assignment.submitBefore,
  });
}

export function assignmentDueUrgency(
  assignment: AssignmentDeadlineFields,
): "overdue" | "due_soon" | null {
  if (assignment.status === "submitted") {
    return null;
  }

  if (assignmentDeadlineExpired(assignment)) {
    return "overdue";
  }

  const now = new Date();
  const dueSoonThreshold = new Date(now);
  dueSoonThreshold.setDate(dueSoonThreshold.getDate() + DUE_SOON_DAYS);

  const effectiveDeadline = getEffectiveAssignmentDeadline(assignment);

  if (!effectiveDeadline) {
    return null;
  }

  if (effectiveDeadline <= dueSoonThreshold) {
    return "due_soon";
  }

  return null;
}
