/** Storybook stub — prevents Vite from bundling pg/server DB code in UI stories. */

export const pool = {
  query: async () => ({ rows: [], rowCount: 0 }),
};

export function isPoolerConnection(_url?: string) {
  return false;
}

export async function checkDbConnection() {
  return "Storybook stub — no database";
}

export function getDatabaseConnectionMeta() {
  return { pooler: false, ssl: "verify-full" };
}
