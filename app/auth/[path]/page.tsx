import Link from "next/link";
import { AuthView } from "@neondatabase/neon-js/auth/react/ui";

export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex w-full flex-1 flex-col px-5">
        <header className="flex justify-between items-center p-4 gap-4 h-16">
          <Link href="/" className="text-sm font-medium">
            Home
          </Link>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4 md:p-6">
          <AuthView
            path={path}
            classNames={{
              base: "bg-card border border-border rounded-lg shadow-sm",
              header: "border-b border-border",
              title: "text-foreground font-semibold",
              description: "text-muted-foreground",
              footerLink: "text-brand hover:text-brand-hover",
              form: {
                input:
                  "bg-card text-foreground border-border placeholder:text-muted-foreground",
                label: "text-foreground",
                primaryButton:
                  "bg-brand text-brand-foreground hover:bg-brand-hover",
              },
            }}
          />
        </main>
      </div>
    </div>
  );
}
