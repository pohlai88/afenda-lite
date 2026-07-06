"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { LinkIcon, RefreshCwIcon } from "lucide-react";
import {
  getAnonymousInviteLinkAction,
  recordEmailInvitationAction,
  regenerateAnonymousInviteLinkAction,
} from "@/app/actions/invitations";
import {
  buildAnonymousEmailMessage,
  buildAnonymousInviteUrl,
  buildAnonymousQrCodeUrl,
  buildAnonymousWhatsAppMessage,
} from "@/lib/invite";
import { portalCopy } from "@/lib/portal-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type InviteLink = {
  token: string;
  url: string;
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function AnonymousSharePanel({
  surveyId,
  publicPath,
  embedded = false,
}: {
  surveyId: string;
  publicPath?: string;
  embedded?: boolean;
}) {
  const { share, invite: inviteCopy } = portalCopy;
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
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
        setInviteLink({ token: result.token, url: result.url });
      }
    });
  }, [surveyId]);

  const privateInviteUrl =
    inviteLink?.token && typeof window !== "undefined"
      ? buildAnonymousInviteUrl(inviteLink.token, window.location.origin)
      : (inviteLink?.url ?? "");

  const publicUrl =
    publicPath && typeof window !== "undefined"
      ? new URL(publicPath, window.location.origin).toString()
      : null;

  return (
    <div className={embedded ? "space-y-4 border-t pt-4" : "space-y-4"}>
      {!embedded ? (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{share.title}</h3>
          <p className="text-sm text-muted-foreground">{share.description}</p>
        </div>
      ) : null}

      {publicUrl ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {share.publicLabel}
          </p>
          <p className="portal-code-block">{publicUrl}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="touch-manipulation"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await copyText(publicUrl);
                setMessage(share.copiedPublicLink);
                setError(null);
              });
            }}
          >
            {share.copyPublicLink}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {share.privateLabel}
        </p>
        {privateInviteUrl ? (
          <p className="portal-code-block">{privateInviteUrl}</p>
        ) : (
          <Skeleton className="h-9 w-full" />
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="touch-manipulation"
            disabled={!privateInviteUrl || isPending}
            onClick={() => {
              if (!privateInviteUrl) return;
              startTransition(async () => {
                await copyText(privateInviteUrl);
                setMessage(share.copiedLink);
                setError(null);
              });
            }}
          >
            <LinkIcon />
            {share.copyLink}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="touch-manipulation"
            disabled={!privateInviteUrl || isPending}
            onClick={() => {
              if (!privateInviteUrl) return;
              startTransition(async () => {
                const { combined } = buildAnonymousEmailMessage(privateInviteUrl);
                await copyText(combined);
                setMessage(share.copiedEmail);
                setError(null);
              });
            }}
          >
            {share.copyEmail}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="touch-manipulation"
            disabled={!privateInviteUrl || isPending}
            onClick={() => {
              if (!privateInviteUrl) return;
              startTransition(async () => {
                await copyText(
                  buildAnonymousWhatsAppMessage(privateInviteUrl),
                );
                setMessage(share.copiedWhatsApp);
                setError(null);
              });
            }}
          >
            {share.copyWhatsApp}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="touch-manipulation"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                setMessage(null);
                setError(null);
                const result =
                  await regenerateAnonymousInviteLinkAction(surveyId);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                if (result && "token" in result) {
                  setInviteLink({ token: result.token, url: result.url });
                  setMessage(share.newLinkGenerated);
                }
              });
            }}
          >
            <RefreshCwIcon />
            {share.newLink}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor={`invite-email-${surveyId}`}>{inviteCopy.emailLabel}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`invite-email-${surveyId}`}
            type="email"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            placeholder={inviteCopy.emailPlaceholder}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 touch-manipulation"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                setMessage(null);
                setError(null);
                const formData = new FormData();
                formData.set("surveyId", surveyId);
                formData.set("email", recipientEmail);
                const result = await recordEmailInvitationAction(formData);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                if (result?.success && result.combined) {
                  await copyText(result.combined);
                  setMessage(inviteCopy.recorded);
                  setRecipientEmail("");
                }
              });
            }}
          >
            {inviteCopy.recordAndCopy}
          </Button>
        </div>
      </div>

      {privateInviteUrl ? (
        <div className="flex items-start gap-3">
          <Image
            src={buildAnonymousQrCodeUrl(privateInviteUrl)}
            alt={share.qrAlt}
            width={96}
            height={96}
            unoptimized
            className="rounded-md border bg-card p-1.5"
          />
          <p className="text-xs text-muted-foreground">{share.qrHint}</p>
        </div>
      ) : null}

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
