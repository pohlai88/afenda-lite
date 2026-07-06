"use client";

import { useState, useTransition } from "react";
import { adminSignInAction } from "@/app/actions/admin";

export function AdminSignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="rounded-2xl border border-border bg-card p-8 shadow-sm"
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
      <h1 className="text-2xl font-semibold">Operator sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Shared admin account for the feedback portal.
      </p>

      <label className="mt-6 block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2"
          placeholder="operator@yourcompany.com"
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2"
        />
      </label>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
