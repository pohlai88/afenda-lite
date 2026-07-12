import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

/** Shared P2-AC-04 feedback primitives — UI only; no domain/RBAC. */

export function TradeFormError({
  message,
  testId = "trade-form-error",
}: {
  message: string | null | undefined;
  testId?: string;
}) {
  if (!message) return null;
  return (
    <p
      className="text-destructive text-sm"
      role="alert"
      data-testid={testId}
    >
      {message}
    </p>
  );
}

export function TradeFormPending({
  pending,
  label = "Saving…",
}: {
  pending: boolean;
  label?: string;
}) {
  if (!pending) return null;
  return (
    <p
      className="text-muted-foreground text-xs"
      aria-live="polite"
      data-testid="fft-form-pending"
    >
      {label}
    </p>
  );
}

export function TradeEmptyState({
  title,
  description,
  testId = "trade-empty-state",
}: {
  title: string;
  description?: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-lg border border-dashed p-4 text-sm"
      data-testid={testId}
    >
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      ) : null}
    </div>
  );
}

/** Route-level loading skeleton for trade admin pages. */
export function TradePageSkeleton({
  rows = 4,
}: {
  rows?: number;
}) {
  return (
    <div className="space-y-4 p-6" data-testid="fft-page-skeleton" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
