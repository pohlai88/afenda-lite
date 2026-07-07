import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";

export default async function SurveyRedirectPage() {
  const { data: session } = await auth.getSession();

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  if (session?.user?.id) {
    redirect("/client");
  }

  redirect("/?reason=login-required");
}
