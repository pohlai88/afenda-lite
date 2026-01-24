import Link from "next/link";
import { AuthView } from "@neondatabase/auth/react";

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
        <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
          <AuthView path={path} />
        </main>
      </div>
    </div>
  );
}
