"use client";

import { useId, useState, useTransition } from "react";
import { adminSignInAction } from "@/app/actions/admin";

export function AdminSignInForm() {
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const errorId = `${formId}-error`;

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      aria-labelledby="sign-in-heading"
      className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur-sm sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await adminSignInAction(formData);
          if (result?.error) {
            setError(result.error);
          }
        });
      }}
    >
      <h2 id="sign-in-heading" className="text-2xl font-semibold text-balance">
        Operator Sign In
      </h2>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        Sign in to manage surveys and review customer responses.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor={emailId} className="block text-sm font-medium">
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="username"
            spellCheck={false}
            className="mt-2 w-full touch-manipulation rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            placeholder="operator@yourcompany.com…"
          />
        </div>

        <div>
          <label htmlFor={passwordId} className="block text-sm font-medium">
            Password
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 w-full touch-manipulation rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-4 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="mt-6 w-full touch-manipulation rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[background-color,opacity] duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
