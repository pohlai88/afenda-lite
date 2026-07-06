"use client";

import { useState, useTransition } from "react";
import { submitSurveyResponseAction } from "@/app/actions/surveys";

const labels = ["Very poor", "Poor", "Okay", "Good", "Excellent"];

export function SurveyForm({
  slug,
  question,
  anonymous = false,
}: {
  slug: string;
  question: string;
  anonymous?: boolean;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold">Thank you</p>
        <p className="mt-2 text-muted-foreground">
          Your feedback has been recorded.
        </p>
      </div>
    );
  }

  return (
    <form
      className="rounded-2xl border border-border bg-card p-8 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (!rating) {
          setError("Please select a rating.");
          return;
        }

        const formData = new FormData();
        formData.set("slug", slug);
        formData.set("rating", String(rating));
        formData.set("comment", comment);

        startTransition(async () => {
          const result = await submitSurveyResponseAction(formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          setSubmitted(true);
        });
      }}
    >
      <p className="text-lg font-medium">{question}</p>

      {anonymous ? (
        <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Anonymous response. Do not include personal details in your comment
          unless you choose to.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-xl border px-3 py-4 text-center transition ${
              rating === value
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border bg-background hover:bg-accent"
            }`}
            onClick={() => setRating(value)}
          >
            <div className="text-xl font-semibold">{value}</div>
            <div className="mt-1 text-xs">{labels[value - 1]}</div>
          </button>
        ))}
      </div>

      <label className="mt-6 block text-sm font-medium">
        Additional comments (optional)
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Tell us what we can improve..."
        />
      </label>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Submit feedback"}
      </button>
    </form>
  );
}
