/**
 * E2E / doc-capture helper — marks Neon Auth email verified when OTP inbox is unavailable.
 * Usage: node --env-file=.env scripts/mark-neon-auth-email-verified.mjs <email>
 */
import { markNeonAuthEmailVerified } from "./lib/mark-neon-auth-email-verified.mjs";

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: node --env-file=.env scripts/mark-neon-auth-email-verified.mjs <email>");
  process.exit(1);
}

markNeonAuthEmailVerified(email)
  .then((row) => {
    console.log(JSON.stringify({ ok: true, user: row }));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
