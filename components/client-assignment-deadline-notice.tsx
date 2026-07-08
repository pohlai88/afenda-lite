import { FormErrorAlert } from "@/components/form-error-alert";
import type { ClientAssignment } from "@/lib/clients";
import {
  assignmentDeadlineExpired,
  assignmentDueUrgency,
  getEffectiveAssignmentDeadline,
} from "@/lib/client-dashboard-metrics";
import { formatDate } from "@/lib/format";
import { portalCopy } from "@/lib/portal-copy";

export function ClientAssignmentDeadlineNotice({
  assignment,
  showExpiredBanner = false,
}: {
  assignment: Pick<
    ClientAssignment,
    "status" | "dueDate" | "submitBefore"
  >;
  showExpiredBanner?: boolean;
}) {
  const copy = portalCopy.clientDashboard;
  const expiredReason = assignmentDeadlineExpired(assignment);
  const urgency = assignmentDueUrgency(assignment);

  if (assignment.status === "submitted") {
    return null;
  }

  const effectiveDeadline = getEffectiveAssignmentDeadline(assignment);

  return (
    <div className="space-y-3">
      {expiredReason ? (
        <FormErrorAlert
          error={
            showExpiredBanner
              ? copy.deadlineExpiredBanner
              : expiredReason === "assignment"
                ? copy.deadlineExpiredAssignment
                : copy.deadlineExpiredDeclaration
          }
        />
      ) : null}

      {!expiredReason && (assignment.dueDate || assignment.submitBefore) ? (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
          <p className="font-medium text-foreground">
            {copy.deadlineRequirementsTitle}
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {assignment.dueDate ? (
              <li>{copy.dueLabel(formatDate(assignment.dueDate))}</li>
            ) : null}
            {assignment.submitBefore ? (
              <li>{copy.submitBeforeLabel(formatDate(assignment.submitBefore))}</li>
            ) : null}
            {effectiveDeadline && urgency === "due_soon" ? (
              <li>{copy.deadlineDueSoonBanner(formatDate(effectiveDeadline))}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
