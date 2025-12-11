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
              base: "bg-white dark:bg-[#0a0a0a] border border-[#E4E5E7] dark:border-[#303236] rounded-lg shadow-sm",
              header: "border-b border-[#E4E5E7] dark:border-[#303236]",
              title: "text-[#171717] dark:text-[#ededed] font-semibold",
              description: "text-[#61646B] dark:text-[#94979E]",
              footerLink: "text-[#00E599] hover:text-[#00E5BF]",
              form: {
                input:
                  "bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-[#ededed] border-[#E4E5E7] dark:border-[#303236] placeholder:text-[#61646B] dark:placeholder:text-[#94979E]",
                label: "text-[#171717] dark:text-[#ededed]",
                primaryButton: "bg-[#00E599] text-[#0C0D0D] hover:bg-[#00E5BF]",
              },
            }}
          />
        </main>
      </div>
    </div>
  );
}
