import { getSession } from "@afenda/auth";

export default async function AdminPage() {
  const session = await getSession();

  return (
    <main className="flex min-h-dvh flex-col gap-3 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Operator admin</h1>
      <p className="text-muted-foreground">
        Authenticated operator shell for org{" "}
        <code className="text-foreground">{session.orgId}</code>.
      </p>
    </main>
  );
}
