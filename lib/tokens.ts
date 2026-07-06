export function createInviteTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}
