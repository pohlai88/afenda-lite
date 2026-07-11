import {
  runSecureLinkPage,
  secureLinkPageMetadata,
} from "@/features/auth/entry/secure-link-entry";

export const dynamic = "force-dynamic";

export const generateMetadata = secureLinkPageMetadata;

/** Secure declaration link — resolves token, then routes to sign-in or assignment. */
export default runSecureLinkPage;
