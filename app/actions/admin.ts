"use server";

import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";

export async function requireAdminSession() {
  const { data: session } = await auth.getSession();

  if (!isAdminSession(session)) {
    redirect("/");
  }

  return session!;
}

export async function adminSignInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await auth.signIn.email({ email, password });

  if (error) {
    return { error: error.message ?? "Sign in failed." };
  }

  redirect("/dashboard");
}
