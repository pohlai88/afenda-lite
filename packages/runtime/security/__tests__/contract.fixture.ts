import {
	type CorsConfig,
	type SecurityHeader,
	security,
} from "@afenda/security";

const entries: readonly SecurityHeader[] = security.headers.create();
const cors: CorsConfig = { origins: ["https://example.test"] };
security.headers.apply(new Headers(), entries);
security.cors.project({ config: cors, requestOrigin: "https://example.test" });
security.csp.serialize({ "default-src": ["'self'"] });

// @ts-expect-error Next.js key-shape belongs to the app adapter
const rejectedKey: string = entries[0]?.key;
new Headers().set("x-rejected", rejectedKey);

// @ts-expect-error authorization is not a security-header package capability
security.authorize({ permission: "admin" });
