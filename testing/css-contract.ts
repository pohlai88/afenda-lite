import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Strip block comments from CSS source for contract assertions. */
export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Read a CSS file relative to `dir` and strip comments. */
export function readCssContract(dir: string, filename: string): string {
  return stripCssComments(readFileSync(join(dir, filename), "utf8"));
}
