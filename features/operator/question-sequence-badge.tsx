import { cn } from "@/lib/utils";

export function QuestionSequenceBadge({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary",
        className,
      )}
      aria-hidden="true"
    >
      {number}
    </span>
  );
}
