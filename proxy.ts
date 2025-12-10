import { neonAuthMiddleware } from "@neondatabase/neon-js/auth/next";

export default neonAuthMiddleware({
  // Redirects unauthenticated users to sign-in page
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    // Run the middleware for all paths, except the static resources
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
