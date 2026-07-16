import "@testing-library/jest-dom/vitest";

/*
 * jsdom does not implement the layout / pointer-capture APIs that Radix UI
 * primitives (Dialog, Select, DropdownMenu, Tooltip, …) rely on. Provide the
 * standard test polyfills so interaction smoke tests exercise real behavior.
 */

if (!window.matchMedia) {
	window.matchMedia = (query: string): MediaQueryList =>
		({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}) as unknown as MediaQueryList;
}

if (!globalThis.ResizeObserver) {
	globalThis.ResizeObserver = class {
		observe() {
			return undefined;
		}
		unobserve() {
			return undefined;
		}
		disconnect() {
			return undefined;
		}
	};
}

if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => undefined;
}
if (!Element.prototype.hasPointerCapture) {
	Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
	Element.prototype.setPointerCapture = () => undefined;
}
if (!Element.prototype.releasePointerCapture) {
	Element.prototype.releasePointerCapture = () => undefined;
}
