import { searchTesting } from "@afenda/search/testing";

export const memorySearch = searchTesting.createMemory();

// @ts-expect-error the concrete memory store is private
export const leakedMemoryStore = searchTesting.MemorySearchStore;
