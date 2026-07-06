import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/admin",
});

export const config = {
  matcher: ["/account/:path*", "/dashboard/:path*"],
};
