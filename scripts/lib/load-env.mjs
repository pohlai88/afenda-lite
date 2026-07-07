import { loadComposedEnv, getEnvValue } from "./env-files.mjs";

/** @deprecated Use loadComposedEnv from env-files.mjs */
export function loadEnvFile() {
  return loadComposedEnv();
}

export function getEnv(key, fileEnv = loadComposedEnv()) {
  return getEnvValue(key, fileEnv);
}
