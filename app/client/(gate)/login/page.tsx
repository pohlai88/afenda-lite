import {
  clientLoginPageMetadata,
  runClientSignInEntryPage,
} from "@/features/auth/entry/client-sign-in-entry";

export const metadata = clientLoginPageMetadata;
export const dynamic = "force-dynamic";

/** Named client sign-in entry for QR codes, access emails, and share links. */
export default runClientSignInEntryPage;
