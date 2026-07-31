import { createSearchCapability } from "./capability";
import { MemorySearchStore } from "./testing/memory-search-store";

/** Isolated test capability; never import from production source. */
export const searchTesting = Object.freeze({
	createMemory: () => createSearchCapability(new MemorySearchStore()),
});
