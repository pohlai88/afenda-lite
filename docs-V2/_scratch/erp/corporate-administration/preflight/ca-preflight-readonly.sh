#!/usr/bin/env bash
# CA-PREFLIGHT-01 evidence collector.
# This script intentionally does not install dependencies, modify source files,
# generate artifacts, or touch a database. It writes evidence only under /tmp
# (or CA_PREFLIGHT_OUTPUT_DIR when explicitly set).

set -uo pipefail
IFS=$'\n\t'

AUTHORITY_BASELINE="${CA_AUTHORITY_BASELINE:-d07f6751fe31da07a2c27814313f15ef7ff90f76}"
AUTHORITY_FILE="${CA_AUTHORITY_FILE:-docs-V2/_scratch/erp/corporate-administration/corporate-administration-integrated-implementation-authority.md}"
OUTPUT_DIR="${CA_PREFLIGHT_OUTPUT_DIR:-${TMPDIR:-/tmp}/ca-preflight-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
RUN_BASELINE_GATES="${CA_PREFLIGHT_RUN_BASELINE_GATES:-1}"

mkdir -p "$OUTPUT_DIR"
REPORT="$OUTPUT_DIR/summary.md"
GATES_TSV="$OUTPUT_DIR/gates.tsv"
STATUS_BEFORE="$OUTPUT_DIR/git-status-before.txt"
STATUS_AFTER="$OUTPUT_DIR/git-status-after.txt"

fatal() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 2
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

for required in git node rg; do
  command_exists "$required" || fatal "Required command not found: $required"
done

PNPM_BIN="${CA_PNPM_BIN:-pnpm}"
PNPM_AVAILABLE="yes"
if ! command_exists "$PNPM_BIN"; then
  PNPM_AVAILABLE="no"
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fatal "Run this inside the Afenda Git repository."
cd "$ROOT" || fatal "Cannot enter repository root: $ROOT"

# Never put package-manager caches in the repository when a tool honors these.
export TMPDIR="${TMPDIR:-/tmp}"
export XDG_CACHE_HOME="$OUTPUT_DIR/xdg-cache"
export TURBO_CACHE_DIR="$OUTPUT_DIR/turbo-cache"
mkdir -p "$XDG_CACHE_HOME" "$TURBO_CACHE_DIR"

# DB-enabled test lanes are forbidden in this read-only collector.
unset DATABASE_URL || true
unset DIRECT_URL || true
unset NEON_DATABASE_URL || true
unset POSTGRES_URL || true
unset POSTGRES_PRISMA_URL || true

safe_name() {
  printf '%s' "$1" | tr -cs 'A-Za-z0-9._-' '_'
}

capture() {
  local name="$1"
  shift
  local file="$OUTPUT_DIR/$(safe_name "$name").log"
  {
    printf '$'
    printf ' %q' "$@"
    printf '\n'
    "$@"
  } >"$file" 2>&1
  local code=$?
  printf '%s\t%s\t%s\n' "$name" "$code" "$file" >>"$GATES_TSV"
  return 0
}

capture_shell() {
  local name="$1"
  local script="$2"
  local file="$OUTPUT_DIR/$(safe_name "$name").log"
  {
    printf '$ bash -lc %q\n' "$script"
    bash -lc "$script"
  } >"$file" 2>&1
  local code=$?
  printf '%s\t%s\t%s\n' "$name" "$code" "$file" >>"$GATES_TSV"
  return 0
}

package_exists() {
  local package_name="$1"
  node - "$package_name" <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const path = require('node:path');
const wanted = process.argv[2];
const roots = ['packages', 'apps', 'tooling', 'testing'];
let found = false;
function visit(dir) {
  if (!fs.existsSync(dir) || found) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.next' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) visit(p);
    if (ent.isFile() && ent.name === 'package.json') {
      try {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (pkg.name === wanted) found = true;
      } catch {}
    }
  }
}
for (const root of roots) visit(root);
process.exit(found ? 0 : 1);
NODE
}

root_script_exists() {
  local script_name="$1"
  node - "$script_name" <<'NODE' >/dev/null 2>&1
const fs = require('node:fs');
const wanted = process.argv[2];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
process.exit(pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, wanted) ? 0 : 1);
NODE
}

run_root_script_if_present() {
  local id="$1"
  local script_name="$2"
  if root_script_exists "$script_name"; then
    if [[ "$PNPM_AVAILABLE" == "yes" ]]; then
      capture "$id" "$PNPM_BIN" "$script_name"
    else
      printf '%s\t%s\t%s\n' "$id" "NOT_AVAILABLE" "pnpm executable not found: $PNPM_BIN" >>"$GATES_TSV"
    fi
  else
    printf '%s\t%s\t%s\n' "$id" "NOT_AVAILABLE" "root script '$script_name' not found" >>"$GATES_TSV"
  fi
}

run_filter_if_present() {
  local id="$1"
  local package_name="$2"
  local script_name="$3"
  if package_exists "$package_name"; then
    if [[ "$PNPM_AVAILABLE" == "yes" ]]; then
      capture "$id" "$PNPM_BIN" --filter "$package_name" "$script_name"
    else
      printf '%s\t%s\t%s\n' "$id" "NOT_AVAILABLE" "pnpm executable not found: $PNPM_BIN" >>"$GATES_TSV"
    fi
  else
    printf '%s\t%s\t%s\n' "$id" "NOT_AVAILABLE" "workspace package '$package_name' not found" >>"$GATES_TSV"
  fi
}

: >"$GATES_TSV"
git status --porcelain=v1 --untracked-files=all >"$STATUS_BEFORE"

HEAD="$(git rev-parse HEAD)"
BRANCH="$(git branch --show-current)"
NODE_VERSION="$(node --version)"
if [[ "$PNPM_AVAILABLE" == "yes" ]]; then
  PNPM_VERSION="$("$PNPM_BIN" --version 2>/dev/null || printf 'ERROR')"
else
  PNPM_VERSION="NOT_AVAILABLE"
fi

BASELINE_EXISTS="no"
BASELINE_IS_ANCESTOR="unknown"
if git cat-file -e "${AUTHORITY_BASELINE}^{commit}" 2>/dev/null; then
  BASELINE_EXISTS="yes"
  if git merge-base --is-ancestor "$AUTHORITY_BASELINE" HEAD 2>/dev/null; then
    BASELINE_IS_ANCESTOR="yes"
  else
    BASELINE_IS_ANCESTOR="no"
  fi
fi

RESOLVED_AUTHORITY=""
if [[ -f "$AUTHORITY_FILE" ]]; then
  RESOLVED_AUTHORITY="$AUTHORITY_FILE"
else
  RESOLVED_AUTHORITY="$(rg -l --hidden \
    --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' \
    '^# Corporate Administration — Integrated Module Implementation Authority$' . 2>/dev/null | head -n 1 || true)"
fi

AUTHORITY_HASH="not-found"
if [[ -n "$RESOLVED_AUTHORITY" && -f "$RESOLVED_AUTHORITY" ]]; then
  if command_exists sha256sum; then
    AUTHORITY_HASH="$(sha256sum "$RESOLVED_AUTHORITY" | awk '{print $1}')"
  elif command_exists shasum; then
    AUTHORITY_HASH="$(shasum -a 256 "$RESOLVED_AUTHORITY" | awk '{print $1}')"
  else
    AUTHORITY_HASH="sha256-tool-unavailable"
  fi
fi

capture "repo-identity" git log -1 --format=%H%n%aI%n%s
capture "repo-status-short-branch" git status --short --branch
capture "repo-diff-name-status" git diff --name-status
capture "repo-diff-cached-name-status" git diff --cached --name-status
capture_shell "instruction-files" "find . \\
  -path './.git' -prune -o \\
  -path './node_modules' -prune -o \\
  -path './.next' -prune -o \\
  -path './dist' -prune -o \\
  \( -name AGENTS.md -o -name CODEX.md -o -name CLAUDE.md -o -path '*/.codex/*' -o -path '*/.github/*' \) \\
  -type f -print | sort"

capture_shell "ca-footprint" "rg -n --hidden \\
  --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' --glob '!coverage/**' \\
  '(@afenda/corporate-administration|corporate-administration|corporate_administration|ca_[a-z][a-z0-9_]*|Corporate Administration and Statutory Registers)' . || true"

capture_shell "master-data-organization-dimension" "rg -n --hidden \\
  --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' \\
  '(organization[-_ ]dimension|get-effective|legal_entity|OrganizationDimensionReference|effective.*dimension)' \\
  packages/erp/master-data packages/data-plane/db apps/web 2>/dev/null || true"

capture_shell "governance-control-plane" "for f in \\
  docs-V2/modules/MODULE-ROADMAP.yaml \\
  packages/erp/README.md \\
  packages/README.md \\
  scripts/validate-modules/checks.mjs \\
  docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml \\
  docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml; do \\
    if [ -e \"\$f\" ]; then printf 'PRESENT %s\\n' \"\$f\"; else printf 'ABSENT  %s\\n' \"\$f\"; fi; \\
  done"

capture_shell "db-migration-tenancy-patterns" "rg -n --hidden \\
  --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' \\
  '(hard-tenant-roots|audit:tenancy-nulls|create_idempotency_key|request_fingerprint|expectedVersion|expected_version|version conflict|effectiveFrom|effective_from|runNeonHttpTransaction|schema ownership)' \\
  packages/data-plane/db packages/erp scripts docs-V2 2>/dev/null || true"

capture_shell "atomicity-audit-outbox-patterns" "rg -n --hidden \\
  --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' \\
  '(runNeonHttpTransaction|UnitOfWork|unit of work|MutationPorts|transaction-scoped|outbox|audit.*transaction|transaction.*audit)' \\
  packages apps testing 2>/dev/null || true"

capture_shell "event-permission-auth-patterns" "rg -n --hidden \\
  --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' \\
  '(platform-permission-catalog|module-ids|authorization.*map|permission.*parity|events/src/schemas|\.v1)' \\
  packages/data-plane/events packages/data-plane/db packages/erp apps/web 2>/dev/null || true"

capture_shell "web-action-route-patterns" "rg -n --hidden \\
  --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' \\
  '(runOperatorPermissionAction|mapPackageResult|ActionResult<|ShellNavModuleId|use server|revalidatePath|revalidateTag)' \\
  apps/web 2>/dev/null || true"

capture_shell "vitest-parity-patterns" "rg -n --hidden \\
  --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**' --glob '!dist/**' \\
  '(vitest|server-only|parity|DATABASE_URL|cleanup.*Neon|failure injection|atomicity|concurrency)' \\
  testing packages/erp apps/web 2>/dev/null || true"

capture_shell "workspace-package-scripts" "node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
for (const root of ['packages', 'apps', 'testing', 'tooling']) {
  if (!fs.existsSync(root)) continue;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', '.next', 'dist', 'coverage'].includes(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(p);
      if (ent.isFile() && ent.name === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (pkg.name && (/master-data|human-resources|payroll|events|db|web|corporate-administration/.test(pkg.name))) {
            console.log(JSON.stringify({ path: p, name: pkg.name, scripts: pkg.scripts || {}, exports: pkg.exports || null }));
          }
        } catch (error) {
          console.error('INVALID_JSON', p, error.message);
        }
      }
    }
  }
}
NODE"

if [[ "$RUN_BASELINE_GATES" == "1" ]]; then
  run_root_script_if_present "gate-validate-modules" "validate:modules"
  run_root_script_if_present "gate-governance-packages" "governance:packages"
  run_filter_if_present "gate-master-data-check" "@afenda/master-data" "check"
  run_filter_if_present "gate-db-lint" "@afenda/db" "lint"
  run_filter_if_present "gate-db-typecheck" "@afenda/db" "typecheck"
  run_filter_if_present "gate-events-lint" "@afenda/events" "lint"
  run_filter_if_present "gate-events-typecheck" "@afenda/events" "typecheck"
  run_filter_if_present "gate-web-typecheck" "@afenda/web" "typecheck"
  run_root_script_if_present "gate-tenancy-nulls" "audit:tenancy-nulls"
else
  printf '%s\t%s\t%s\n' "baseline-gates" "NOT_RUN" "CA_PREFLIGHT_RUN_BASELINE_GATES=$RUN_BASELINE_GATES" >>"$GATES_TSV"
fi

git status --porcelain=v1 --untracked-files=all >"$STATUS_AFTER"
REPO_MUTATED="no"
if ! cmp -s "$STATUS_BEFORE" "$STATUS_AFTER"; then
  REPO_MUTATED="yes"
  diff -u "$STATUS_BEFORE" "$STATUS_AFTER" >"$OUTPUT_DIR/git-status-change.diff" || true
fi

{
  printf '# CA-PREFLIGHT-01 evidence summary\n\n'
  printf '> This is evidence collection only. A human/Codex analysis must still apply the mission verdict rules.\n\n'
  printf '| Field | Value |\n|---|---|\n'
  printf '| Repository root | `%s` |\n' "$ROOT"
  printf '| Branch | `%s` |\n' "${BRANCH:-DETACHED}"
  printf '| HEAD | `%s` |\n' "$HEAD"
  printf '| Authority baseline | `%s` |\n' "$AUTHORITY_BASELINE"
  printf '| Baseline exists locally | `%s` |\n' "$BASELINE_EXISTS"
  printf '| Baseline is ancestor of HEAD | `%s` |\n' "$BASELINE_IS_ANCESTOR"
  printf '| Authority file | `%s` |\n' "${RESOLVED_AUTHORITY:-NOT_FOUND}"
  printf '| Authority SHA-256 | `%s` |\n' "$AUTHORITY_HASH"
  printf '| Node | `%s` |\n' "$NODE_VERSION"
  printf '| pnpm | `%s` |\n' "$PNPM_VERSION"
  printf '| pnpm executable | `%s` |\n' "$PNPM_BIN"
  printf '| Evidence directory | `%s` |\n' "$OUTPUT_DIR"
  printf '| Repository status changed by collector/gates | `%s` |\n\n' "$REPO_MUTATED"

  printf '## Command evidence\n\n'
  printf '| Check | Exit/status | Log |\n|---|---:|---|\n'
  while IFS=$'\t' read -r id code log; do
    printf '| `%s` | `%s` | `%s` |\n' "$id" "$code" "$log"
  done <"$GATES_TSV"

  printf '\n## Safety result\n\n'
  if [[ "$REPO_MUTATED" == "yes" ]]; then
    printf '**FAIL:** repository status changed. Inspect `%s`; do not auto-clean or discard user work.\n' "$OUTPUT_DIR/git-status-change.diff"
  else
    printf '**PASS:** tracked/untracked Git status is unchanged from collector start.\n'
  fi

  if [[ -z "$RESOLVED_AUTHORITY" ]]; then
    printf '\n**BLOCKED:** Corporate Administration authority was not found. Supply it with `CA_AUTHORITY_FILE=/path/to/file`.\n'
  fi

  printf '\n## Next step\n\n'
  printf 'Use the evidence logs to complete the 16-section report in `CA-PREFLIGHT-01-CODEX-MISSION.md`. Do not treat this collector as an implementation or readiness verdict.\n'
} >"$REPORT"

cat "$REPORT"
printf '\nEvidence saved outside the repository: %s\n' "$OUTPUT_DIR"

if [[ "$REPO_MUTATED" == "yes" ]]; then
  exit 3
fi
if [[ -z "$RESOLVED_AUTHORITY" ]]; then
  exit 4
fi
exit 0
