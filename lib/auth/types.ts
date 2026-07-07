/** Minimal Neon Auth session shape shared across server auth helpers. */
export type AuthSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  };
} | null;

export type BootstrapClientAuthInput = {
  userId: string;
  email?: string | null;
  userMetadata?: Record<string, unknown> | null;
};
