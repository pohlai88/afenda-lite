/**
 * `Providers` gateway door — deliberately separate from `./playground`.
 *
 * `Providers` -> settingsContext -> fonts.ts imports `next/font/google` and
 * `geist/font/pixel` (`next/font/local`), which are Next.js compiler-only
 * constructs. They execute correctly inside a real Next.js build (this is
 * how `apps/web/app/playground/layout.tsx` consumes this) but cannot be
 * evaluated by a plain Node/Vitest process. Tests verify this subpath's
 * wiring statically (source text + exports map), never by importing it.
 */
export { default as Providers } from "../components/Providers";
