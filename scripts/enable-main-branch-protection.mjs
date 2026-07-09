/**
 * Enable branch protection on main with required CI jobs.
 *
 * Usage: npm run protect:main
 * Requires: gh auth with admin:repo_hook or repo admin.
 */
import { spawnSync } from "node:child_process";

const payload = {
  required_status_checks: {
    strict: true,
    contexts: ["quality", "journey"],
  },
  enforce_admins: false,
  required_pull_request_reviews: null,
  restrictions: null,
  required_linear_history: false,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: false,
  lock_branch: false,
  allow_fork_syncing: false,
};

function main() {
  const body = JSON.stringify(payload);
  const result = spawnSync(
    "gh",
    [
      "api",
      "-X",
      "PUT",
      "repos/pohlai88/iam-check/branches/main/protection",
      "--input",
      "-",
    ],
    {
      encoding: "utf8",
      input: body,
      shell: false,
      env: { ...process.env, GITHUB_TOKEN: undefined },
    },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    console.error(
      "\nIf forbidden: enable manually in GitHub → Settings → Branches → main.",
    );
    process.exit(result.status ?? 1);
  }

  console.log("Branch protection enabled on main.");
  console.log("Required checks: quality, journey");
  console.log(JSON.stringify(JSON.parse(result.stdout), null, 2));
}

main();
