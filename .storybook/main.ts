import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "..");
const nextLinkMock = path.resolve(dirname, "./mocks/next-link.tsx");
const nextImageMock = path.resolve(dirname, "./mocks/next-image.tsx");
const serverOnlyMock = path.resolve(dirname, "./mocks/server-only.ts");
const dbMock = path.resolve(dirname, "./mocks/db.ts");
const pgMock = path.resolve(dirname, "./mocks/pg.ts");
const adminActionsMock = path.resolve(dirname, "./mocks/app-actions-admin.ts");
const nextNavigationMock = path.resolve(dirname, "./mocks/next-navigation.ts");

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  staticDirs: [{ from: path.join(projectRoot, "public"), to: "/" }],
  framework: "@storybook/react-vite",
  addons: ["@storybook/addon-mcp"],

  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    const existingAliases = Array.isArray(viteConfig.resolve.alias)
      ? viteConfig.resolve.alias
      : Object.entries(viteConfig.resolve.alias ?? {}).map(([find, replacement]) => ({
          find,
          replacement,
        }));

    viteConfig.resolve.alias = [
      // Specific mocks must precede the broad `@` alias.
      { find: "server-only", replacement: serverOnlyMock },
      { find: /^@\/app\/actions\/admin(?:\.ts)?$/, replacement: adminActionsMock },
      { find: /[/\\]app[/\\]actions[/\\]admin(?:\.ts)?$/, replacement: adminActionsMock },
      { find: /^next\/navigation$/, replacement: nextNavigationMock },
      { find: /^@\/lib\/db(?:\.ts)?$/, replacement: dbMock },
      { find: /[/\\]lib[/\\]db(?:\.ts)?$/, replacement: dbMock },
      { find: "pg", replacement: pgMock },
      ...existingAliases.filter((alias) => {
        const find = typeof alias.find === "string" ? alias.find : alias.find.toString();
        return (
          find !== "@" &&
          find !== "server-only" &&
          find !== "pg" &&
          find !== "next/navigation" &&
          !find.includes("app/actions/admin") &&
          !find.includes("app\\actions\\admin") &&
          !find.includes("lib/db") &&
          !find.includes("lib\\db")
        );
      }),
      { find: "@", replacement: projectRoot },
      { find: /^next\/link$/, replacement: nextLinkMock },
      { find: /^next\/image$/, replacement: nextImageMock },
    ];

    viteConfig.server = {
      ...viteConfig.server,
      fs: {
        ...viteConfig.server?.fs,
        allow: [...(viteConfig.server?.fs?.allow ?? []), projectRoot],
      },
      watch: {
        ...viteConfig.server?.watch,
        ignored: ["**/storybook-static/**", ...(Array.isArray(viteConfig.server?.watch?.ignored)
          ? viteConfig.server.watch.ignored
          : viteConfig.server?.watch?.ignored
            ? [viteConfig.server.watch.ignored]
            : [])],
      },
    };

    viteConfig.define = {
      ...viteConfig.define,
      "process.env.NODE_ENV": JSON.stringify("development"),
      "process.env.NEXT_PUBLIC_VERCEL_ENV": JSON.stringify("development"),
    };

    return viteConfig;
  },
};

export default config;
