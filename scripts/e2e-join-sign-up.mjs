/**
 * E2E helper — create Neon Auth user via API (OTP inbox unavailable in CI).
 * Usage: node --env-file=.env scripts/e2e-join-sign-up.mjs <email> <password> <name>
 */
import { signUpEmail } from "./lib/neon-auth-seed.mjs";

const email = process.argv[2]?.trim();
const password = process.argv[3];
const name = process.argv[4]?.trim();

if (!email || !password || !name) {
  console.error(
    "Usage: node --env-file=.env scripts/e2e-join-sign-up.mjs <email> <password> <name>",
  );
  process.exit(1);
}

try {
  const body = await signUpEmail({ email, password, name });
  console.log(JSON.stringify({ ok: true, body }));
} catch (error) {
  console.error(error);
  process.exit(1);
}
