import {
  orgLoginPageMetadata,
  runOrgSignInEntryPage,
} from "@/lib/entry/org-sign-in-entry";

export const metadata = orgLoginPageMetadata;
export const dynamic = "force-dynamic";

/** Canonical operator sign-in entry — dispatches session then Neon Auth org shell. */
export default runOrgSignInEntryPage;
