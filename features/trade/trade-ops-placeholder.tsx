import Link from "next/link";
import { tradeHref } from "@/modules/trade/i18n/trade";

/** P3 ops surface — flag-gated; not enterprise MVP. */
export function TradeOpsPlaceholder({ title }: { title: string }) {
  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        Ops handoff lane (deposits / pickup / imports / ERP) is Phase P3 — enable
        only when Hot Sales feature flags and gate-register allow.
      </p>
      <Link className="text-sm underline" href={tradeHref("/admin/events")}>
        Back to admin events
      </Link>
    </main>
  );
}
