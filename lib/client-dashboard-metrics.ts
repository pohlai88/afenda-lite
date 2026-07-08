import type { ClientAssignment } from "@/lib/clients";
import { getDeclarationDeadlineError } from "@/lib/declaration-deadlines";

const DUE_SOON_DAYS = 7;

export type MetricTrendVariant = "positive" | "negative" | "neutral";

export type MetricTrend = {
  label: string;
  variant: MetricTrendVariant;
};

export type ClientDashboardMetrics = {
  pending: number;
  submitted: number;
  dueSoon: number;
  total: number;
  trends: {
    pending: MetricTrend;
    submitted: MetricTrend;
    dueSoon: MetricTrend;
  };
};

function pendingTrend(pending: number, total: number): MetricTrend {
  if (total === 0) {
    return { label: "No assignments", variant: "neutral" };
  }
  if (pending === 0) {
    return { label: "All complete", variant: "positive" };
  }
  const share = Math.round((pending / total) * 100);
  return {
    label: `${share}% open`,
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

function dueSoonTrend(dueSoon: number, pending: number): MetricTrend {
  if (pending === 0) {
    return { label: "None pending", variant: "positive" };
  }
  if (dueSoon === 0) {
    return { label: "No deadlines soon", variant: "positive" };
  }
  return {
    label: `${dueSoon} within 7 days`,
    variant: "negative",
  };
}

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
    if (assignmentDueUrgency(assignment) === "due_soon") {
      dueSoon += 1;
    }
  }

  const total = assignments.length;

  return {
    pending,
    submitted,
    dueSoon,
    total,
    trends: {
      pending: pendingTrend(pending, total),
      submitted: submittedTrend(submitted, total),
      dueSoon: dueSoonTrend(dueSoon, pending),
    },
  };
}

export function assignmentDeadlineExpired(
  assignment: ClientAssignment,
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
  assignment: ClientAssignment,
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

  const effectiveDeadline =
    assignment.dueDate && assignment.submitBefore
      ? assignment.dueDate < assignment.submitBefore
        ? assignment.dueDate
        : assignment.submitBefore
      : assignment.dueDate ?? assignment.submitBefore;

  if (!effectiveDeadline) {
    return null;
  }

  if (effectiveDeadline <= dueSoonThreshold) {
    return "due_soon";
  }

  return null;
}
