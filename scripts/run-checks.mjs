import { spawn } from "node:child_process";

const checks = ["check:copy", "check:nav", "check:proxy", "check:playground", "check:db-schema", "check:brand-icons", "check:env-manifest-drift", "evaluate:ui-matrix", "check:storybook-coverage", "check:import-boundaries", "check:repo-migration-map", "check:reliance-mapping-drift", "check:reliance-graph-drift", "check:reliance-coverage", "check:route-coverage-drift", "check:ui-sync"];

function runCheck(script) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script], {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${script} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  await Promise.all(checks.map((script) => runCheck(script)));
  console.log(`checks OK (${checks.length} parallel gates)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
