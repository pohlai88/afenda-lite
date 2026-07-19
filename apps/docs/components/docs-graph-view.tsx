import { GraphView } from "@/components/graph-view";
import { buildGraph } from "@/lib/build-graph";

/** Server wrapper so MDX can render Graph View without client data loaders. */
export function DocsGraphView() {
	return <GraphView graph={buildGraph()} />;
}
