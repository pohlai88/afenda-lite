export function AuthSlotSampleCard() {
  return (
    <section
      aria-labelledby="auth-slot-sample-title"
      className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg"
    >
      <h2 id="auth-slot-sample-title" className="text-lg font-semibold">
        Access Vault
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Sample auth chamber only. Real Neon Auth is injected by the route adapter
        in a follow-up PR.
      </p>

      <div className="mt-6 grid gap-3">
        <div className="h-10 rounded-md border border-input bg-background" />
        <div className="h-10 rounded-md border border-input bg-background" />
        <div className="h-10 rounded-md bg-primary" />
      </div>
    </section>
  );
}
