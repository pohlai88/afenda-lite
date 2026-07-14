import { getSession } from "@afenda/auth";

export default async function ClientDashboardPage() {
  const session = await getSession();

  return (
    <main className="flex min-h-dvh flex-col gap-3 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Client dashboard</h1>
      <p className="text-muted-foreground">
        Authenticated client shell for org{" "}
        <code className="text-foreground">{session.orgId}</code>.
      </p>
    </main>
  );
}
