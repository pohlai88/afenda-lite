import type { HttpContext } from "./context";

export type HttpHandler = (
	request: Request,
	ctx: HttpContext,
) => Response | Promise<Response>;

export type HttpMiddleware = (
	request: Request,
	ctx: HttpContext,
	next: HttpHandler,
) => Response | Promise<Response>;

function isHttpHandler(
	fn: HttpMiddleware | HttpHandler,
	isTerminal: boolean,
): fn is HttpHandler {
	return isTerminal;
}

/**
 * Compose Fetch middleware then a terminal handler (rightmost arg).
 * Execution order: leftmost middleware runs first.
 */
export function compose(
	...stack: [...HttpMiddleware[], HttpHandler]
): HttpHandler {
	if (stack.length === 0) {
		throw new Error("@afenda/http compose requires at least one handler");
	}

	const lastIndex = stack.length - 1;

	return (request, ctx) => {
		let index = -1;

		const dispatch = (
			i: number,
			req: Request,
			c: HttpContext,
		): Promise<Response> => {
			if (i <= index) {
				throw new Error("@afenda/http compose: next() called multiple times");
			}
			index = i;
			const fn = stack[i];
			if (fn === undefined) {
				throw new Error(
					"@afenda/http compose: stack exhausted without response",
				);
			}

			if (isHttpHandler(fn, i === lastIndex)) {
				return Promise.resolve(fn(req, c));
			}

			return Promise.resolve(
				fn(req, c, (nextReq, nextCtx) => dispatch(i + 1, nextReq, nextCtx)),
			);
		};

		return dispatch(0, request, ctx);
	};
}
