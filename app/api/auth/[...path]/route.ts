import { auth } from "@/modules/identity/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Neon Auth catch-all — do not duplicate auth flows elsewhere under /api. */
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
