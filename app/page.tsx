import {
  clientLoginPageMetadata,
  runClientSignInEntryPage,
} from "@/lib/client-sign-in-entry";

export const metadata = clientLoginPageMetadata;
export const dynamic = "force-dynamic";

/** Session router — same client sign-in dispatch as `/client/login`. */
export default runClientSignInEntryPage;
