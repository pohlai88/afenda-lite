export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">403</h1>
      <p className="text-muted-foreground">
        You do not have access to this surface.
      </p>
    </main>
  );
}
