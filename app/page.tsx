import Link from "next/link";
import { UserButton } from "@/components/user-button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-sm text-muted-foreground">Customer feedback</p>
          <h1 className="text-2xl font-semibold">Feedback Portal</h1>
        </div>
        <UserButton />
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-semibold tracking-tight">
            Collect customer feedback in minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create a 1–5 satisfaction survey, share a public link with
            customers, and review responses in your dashboard. Built on Vercel,
            Neon Postgres, and Neon Auth.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/sign-up"
              className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Get started
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Create",
              body: "Sign in and publish a survey with a title and one core question.",
            },
            {
              title: "Share",
              body: "Send customers a public link. No account required to respond.",
            },
            {
              title: "Review",
              body: "Track average score and read comments from your dashboard.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
