import { runClientHomeEntryPage } from "@/features/auth/entry/client-home-entry";
import { clientLoginPageMetadata } from "@/features/auth/entry/client-sign-in-entry";

export const metadata = clientLoginPageMetadata;
export const dynamic = "force-dynamic";

/**
 * Guest landing (Lynx laptop hero) + session skip for authenticated users.
 * Named client entry `/client/login` still redirects straight to Neon sign-in.
 * Playground `?embed=1` keeps the landing visible for local review.
 */
export default runClientHomeEntryPage;
