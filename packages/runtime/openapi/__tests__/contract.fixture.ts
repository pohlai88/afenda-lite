import { openapi } from "@afenda/openapi";

const registry = openapi.registry.create();
const schema = openapi.envelope.data(
	openapi.schema.z.object({ id: openapi.schema.z.string() }),
	"FixtureEnvelope",
);
registry.schema("FixtureEnvelope", schema);

// @ts-expect-error vendor definitions are private
export const vendorDefinitions = registry.definitions;

// @ts-expect-error error projections are owned by @afenda/errors
openapi.error.responses(["NOT_FOUND"]);

// @ts-expect-error document generation requires canonical operation and document metadata
registry.document({
	config: { openapi: "3.0.3", info: { title: "x", version: "1" } },
});
