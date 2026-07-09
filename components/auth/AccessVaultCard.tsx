"use client";

import type { FormEvent } from "react";
import { GuardianIdentityMark } from "./GuardianIdentityMark";
import type { GuardianMode, GuardianState } from "./types";
import { portalCopy } from "@/lib/copy/portal-copy";

type Props = {
  mode?: GuardianMode;
  state?: GuardianState;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Mock vault form — Storybook / design review only.
 * Mirrors Neon 2-path conveniences (credentials + magic link + Google).
 * Production auth uses PortalAuthNeonView inside GuardianAuthFacade (ADR-Auth-UI-001).
 */
export function AccessVaultCard({
  mode = "night",
  state = "idle",
  onSubmit,
}: Props) {
  const disabled = state === "loading" || state === "locked";
  const { signIn, magicLink } = portalCopy;

  return (
    <form className="access-vault" data-state={state} onSubmit={onSubmit}>
      <div className="access-vault__emblem" aria-hidden="true">
        <GuardianIdentityMark mode={mode} surface="emblem" />
      </div>

      <h2 className="access-vault__title">{signIn.title}</h2>
      <p className="access-vault__subtitle">{signIn.description}</p>

      <label className="access-vault__field">
        <span>{signIn.emailLabel}</span>
        <input
          type="email"
          name="email"
          placeholder={signIn.emailPlaceholder}
          autoComplete="email"
          disabled={disabled}
        />
      </label>

      <label className="access-vault__field">
        <span>{signIn.passwordLabel}</span>
        <input
          type="password"
          name="password"
          placeholder="Your secret"
          autoComplete="current-password"
          disabled={disabled}
        />
      </label>

      <button className="access-vault__submit" type="submit" disabled={disabled}>
        <span aria-hidden="true">{state === "loading" ? "◌" : "▣"}</span>
        {state === "loading" ? "Unlocking..." : signIn.submit}
      </button>

      <div className="access-vault__divider">
        <span>or continue with</span>
      </div>

      <button
        className="access-vault__magic"
        type="button"
        disabled={disabled}
      >
        {magicLink.sendLinkAction}
      </button>

      <button className="access-vault__google" type="button" disabled={disabled}>
        <span aria-hidden="true">G</span>
        Continue with Google
      </button>

      <p className="access-vault__footer">
        New here? <a href="/auth/sign-up">Create account</a>
      </p>

      {state === "error" && (
        <p className="access-vault__message access-vault__message--error">
          We could not verify those credentials.
        </p>
      )}

      {state === "success" && (
        <p className="access-vault__message access-vault__message--success">
          Verified. Opening your vault.
        </p>
      )}
    </form>
  );
}
