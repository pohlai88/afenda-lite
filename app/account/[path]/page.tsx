import Link from "next/link";
import { AccountView } from "@neondatabase/neon-js/auth/react/ui";
import { accountViewPaths } from "@neondatabase/neon-js/auth/react/ui/server";
import { UserButton } from "@/components/user-button";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export default async function AccountPage({
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
          <UserButton />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-3 py-4 md:py-6">
          <AccountView
            path={path}
            classNames={{
              base: "bg-card",
              card: {
                base: "bg-card border-border",
                title: "text-foreground font-semibold",
                description: "text-muted-foreground",
                content: "bg-card",
                footer: "bg-muted border-t border-border",
                input:
                  "bg-card text-foreground border-border placeholder:text-muted-foreground",
                button: "bg-primary text-primary-foreground hover:opacity-90",
                outlineButton:
                  "bg-transparent text-foreground border-border hover:bg-accent",
                cell: "bg-muted border-border text-foreground",
              },
              sidebar: {
                base: "border-border",
                button:
                  "text-muted-foreground hover:text-brand hover:bg-transparent",
                buttonActive: "text-brand bg-transparent",
              },
            }}
          />
        </main>
      </div>
    </div>
  );
}
