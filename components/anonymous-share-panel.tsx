"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getAnonymousInviteLinkAction,
  regenerateAnonymousInviteLinkAction,
} from "@/app/actions/invitations";
import {
  buildAnonymousEmailMessage,
  buildAnonymousInviteUrl,
  buildAnonymousQrCodeUrl,
  buildAnonymousWhatsAppMessage,
} from "@/lib/invite";

type InviteLink = {
  token: string;
  url: string;
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function AnonymousSharePanel({ surveyId }: { surveyId: string }) {
  const [invite, setInvite] = useState<InviteLink | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getAnonymousInviteLinkAction(surveyId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result && "token" in result) {
        setInvite({ token: result.token, url: result.url });
      }
    });
  }, [surveyId]);

  const localInviteUrl =
    invite?.token && typeof window !== "undefined"
      ? buildAnonymousInviteUrl(invite.token, window.location.origin)
      : invite?.url ?? "";

  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-medium">Anonymous share</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Masked invite links hide survey details in the URL. Copy a neutral
        message and send it from any email or WhatsApp account — your operator
        login is never shared with clients.
      </p>

      <div className="mt-3 rounded-lg border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        {localInviteUrl || "Generating anonymous link..."}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!localInviteUrl || isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          onClick={() => {
            if (!localInviteUrl) return;
            startTransition(async () => {
              await copyText(localInviteUrl);
              setMessage("Anonymous link copied.");
              setError(null);
            });
          }}
        >
          Copy link
        </button>

        <button
          type="button"
          disabled={!localInviteUrl || isPending}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
          onClick={() => {
            if (!localInviteUrl) return;
            startTransition(async () => {
              const { combined } = buildAnonymousEmailMessage(localInviteUrl);
              await copyText(combined);
              setMessage(
                "Email message copied. Paste into Gmail, Outlook, or any mail app.",
              );
              setError(null);
            });
          }}
        >
          Copy for email
        </button>

        <button
          type="button"
          disabled={!localInviteUrl || isPending}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
          onClick={() => {
            if (!localInviteUrl) return;
            startTransition(async () => {
              await copyText(
                buildAnonymousWhatsAppMessage(localInviteUrl),
              );
              setMessage(
                "WhatsApp message copied. Paste into WhatsApp and choose a contact.",
              );
              setError(null);
            });
          }}
        >
          Copy for WhatsApp
        </button>

        <button
          type="button"
          disabled={isPending}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
          onClick={() => {
            startTransition(async () => {
              setMessage(null);
              setError(null);
              const result = await regenerateAnonymousInviteLinkAction(surveyId);
              if (result?.error) {
                setError(result.error);
                return;
              }
              if (result && "token" in result) {
                setInvite({ token: result.token, url: result.url });
                setMessage("New anonymous link generated.");
              }
            });
          }}
        >
          New link
        </button>
      </div>

      {localInviteUrl ? (
        <div className="mt-4 flex items-start gap-4">
          <img
            src={buildAnonymousQrCodeUrl(localInviteUrl)}
            alt="QR code for anonymous survey link"
            width={120}
            height={120}
            className="rounded-lg border border-border bg-white p-2"
          />
          <p className="text-xs text-muted-foreground">
            Scan to open the anonymous survey. No names or emails are collected
            from respondents.
          </p>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs text-brand">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
