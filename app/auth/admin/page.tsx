import {
  orgLoginPageMetadata,
  runOrgSignInEntryPage,
} from "@/lib/org-sign-in-entry";

export const metadata = orgLoginPageMetadata;
export const dynamic = "force-dynamic";

/** Legacy alias — canonical operator entry is `/org/login`. */
export default runOrgSignInEntryPage;
