import { Button } from "@afenda/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Afenda-Lite</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Public shell under{" "}
        <code className="text-foreground">app/(public)</code>. Operator and
        client surfaces are role-gated.
      </p>
      <Button type="button">Shell ready</Button>
    </main>
  );
}
