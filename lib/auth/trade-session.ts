import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth/get-session";
import { AUTH_SIGN_IN_HREF } from "@/lib/portal-routes";
import { canSalesAccessTrade } from "@/lib/domain/trade/access";
import { listSalesMembers } from "@/lib/domain/trade/store";

export async function requireTradeAccess(): Promise<{
  userId: string;
  email: string;
  isAdmin: boolean;
}> {
  const session = await getAuthSession();
  const user = session?.user;
  if (!user?.id || !user.email) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  const isAdmin = isAdminSession(session);
  const members = await listSalesMembers();

  if (!canSalesAccessTrade(members, user.email, isAdmin)) {
    redirect(`${AUTH_SIGN_IN_HREF}?reason=trade-access-denied`);
  }

  return { userId: user.id, email: user.email, isAdmin };
}

export async function requireTradeAdmin(): Promise<{
  userId: string;
  email: string;
}> {
  const access = await requireTradeAccess();
  if (!access.isAdmin) {
    redirect("/trade/vi/events");
  }
  return { userId: access.userId, email: access.email };
}
