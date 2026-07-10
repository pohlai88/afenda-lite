"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import {
  processErpSyncJobsAction,
  retryErpSyncJobAction,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import type { HotSalesSyncJobDetail } from "@/lib/domain/trade/erp/types";
import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import { tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export function TradeErpSyncNavLink({ locale }: { locale: TradeLocale }) {
  return (
    <Link
      href={tradeHref(locale, "/admin/erp-sync")}
      className="text-primary underline-offset-4 hover:underline"
    >
      ERP sync
    </Link>
  );
}

export function TradeErpSyncPanel({
  locale,
  jobs,
}: {
  locale: TradeLocale;
  jobs: HotSalesSyncJobDetail[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dlqCount = jobs.filter(
    (j) => j.status === "failed" || j.status === "dead",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setActionError(null);
            startTransition(async () => {
              const result = await processErpSyncJobsAction(locale);
              const err = getTradeActionError(result);
              if (err) {
                setActionError(err);
                return;
              }
              router.refresh();
            });
          }}
        >
          Process pending jobs
        </Button>
        <span className="text-muted-foreground text-sm">
          DLQ (failed/dead): {dlqCount}
        </span>
      </div>

      {actionError ? (
        <p className="text-destructive text-sm">{actionError}</p>
      ) : null}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="p-2 w-8" />
              <th className="p-2">Type</th>
              <th className="p-2">Entity</th>
              <th className="p-2">Status</th>
              <th className="p-2">Attempts</th>
              <th className="p-2">Error</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={7}>
                  No sync jobs yet.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const isExpanded = expandedId === job.id;
                const canExpand = job.attempts.length > 0;
                return (
                  <Fragment key={job.id}>
                    <tr className="border-b">
                      <td className="p-2 align-top">
                        {canExpand ? (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedId(isExpanded ? null : job.id)
                            }
                          >
                            {isExpanded ? "▼" : "▶"}
                          </button>
                        ) : null}
                      </td>
                      <td className="p-2">{job.jobType}</td>
                      <td className="p-2 font-mono text-xs">{job.entityId}</td>
                      <td className="p-2">{job.status}</td>
                      <td className="p-2">{job.attemptCount}</td>
                      <td className="p-2 text-destructive max-w-xs truncate">
                        {job.lastError ?? "—"}
                      </td>
                      <td className="p-2">
                        {job.status === "failed" || job.status === "dead" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => {
                              setActionError(null);
                              startTransition(async () => {
                                const result = await retryErpSyncJobAction(
                                  locale,
                                  job.id,
                                );
                                const err = getTradeActionError(result);
                                if (err) {
                                  setActionError(err);
                                  return;
                                }
                                router.refresh();
                              });
                            }}
                          >
                            Retry
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                    {isExpanded && canExpand ? (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={7} className="p-3">
                          <DlqDetail job={job} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DlqDetail({ job }: { job: HotSalesSyncJobDetail }) {
  return (
    <div className="space-y-2 text-xs">
      <p className="font-medium">Idempotency: {job.idempotencyKey}</p>
      {job.attempts.length === 0 ? (
        <p className="text-muted-foreground">No attempt history.</p>
      ) : (
        <ul className="space-y-2">
          {job.attempts.map((attempt) => (
            <li key={attempt.id} className="rounded border bg-background p-2">
              <p>
                Attempt #{attempt.attemptNo} · {attempt.status} ·{" "}
                {attempt.startedAt.toISOString()}
                {attempt.finishedAt
                  ? ` → ${attempt.finishedAt.toISOString()}`
                  : ""}
              </p>
              {attempt.errors.length > 0 ? (
                <ul className="mt-1 text-destructive">
                  {attempt.errors.map((err) => (
                    <li key={err.id}>
                      [{err.code}] {err.message}
                      {err.retryable ? " (retryable)" : " (non-retryable)"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
