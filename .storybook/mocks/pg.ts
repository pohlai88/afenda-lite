/** Storybook stub — prevents Vite from bundling node-postgres in UI stories. */

export class Pool {
  query = async () => ({ rows: [], rowCount: 0 });
  connect = async () => ({
    query: async () => ({ rows: [], rowCount: 0 }),
    release: () => undefined,
  });
  end = async () => undefined;
}

export type PoolClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};
