import { AdminSignInForm } from "@/components/admin-sign-in-form";

export default function AdminSignInPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-md">
        <AdminSignInForm />
      </div>
    </main>
  );
}
