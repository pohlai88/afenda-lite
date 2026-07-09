"use client";

import type { FormEvent } from "react";
import type { GuardianState } from "./types";

type Props = {
  state?: GuardianState;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Mock vault form — Storybook / design review only.
 * Production auth uses PortalAuthNeonView inside GuardianAuthFacade (ADR-Auth-UI-001).
 */
export function AccessVaultCard({ state = "idle", onSubmit }: Props) {
  const disabled = state === "loading" || state === "locked";

  return (
    <form className="access-vault" data-state={state} onSubmit={onSubmit}>
      <div className="access-vault__emblem" aria-hidden="true">
        <span>⌑</span>
      </div>

      <h2 className="access-vault__title">Access Vault</h2>
      <p className="access-vault__subtitle">Enter your credentials to continue</p>

      <label className="access-vault__field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={disabled}
        />
      </label>

      <label className="access-vault__field">
        <span>Password</span>
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
        {state === "loading" ? "Unlocking..." : "Unlock"}
      </button>

      <div className="access-vault__divider">
        <span>or continue with</span>
      </div>

      <button className="access-vault__google" type="button" disabled={disabled}>
        <span aria-hidden="true">G</span>
        Continue with Google
      </button>

      <p className="access-vault__footer">
        New here? <a href="/create-account">Create account</a>
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
