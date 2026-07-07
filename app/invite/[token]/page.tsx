import { redirect } from "next/navigation";

/** Legacy portal invite URLs — clients must use the Supabase invite email instead. */
export default async function InviteRedirectPage() {
  redirect("/?reason=check-email");
}
