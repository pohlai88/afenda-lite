import type { ClientAssignment } from "@/lib/clients";

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
    if (
      assignment.dueDate &&
      assignment.dueDate >= now &&
      assignment.dueDate <= dueSoonThreshold
    ) {
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
