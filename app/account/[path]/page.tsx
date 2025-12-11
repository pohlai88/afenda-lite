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
              base: "bg-white dark:bg-[#0a0a0a]",
              card: {
                base: "bg-white dark:bg-[#0a0a0a] border-[#E4E5E7] dark:border-[#303236]",
                title: "text-[#171717] dark:text-[#ededed] font-semibold",
                description: "text-[#61646B] dark:text-[#94979E]",
              },
              sidebar: {
                base: "border-[#E4E5E7] dark:border-[#303236]",
                button:
                  "text-[#61646B] dark:text-[#94979E] hover:text-[#00E599]",
                buttonActive: "text-[#00E599]",
              },
            }}
          />
        </main>
      </div>
    </div>
  );
}
