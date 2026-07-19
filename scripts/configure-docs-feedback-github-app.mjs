/**
 * One-shot: GitHub App Manifest flow for Docs feedback (Discussions write).
 * Uses gh api for code to credentials conversion; writes GITHUB_APP_* to .env.local.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envLocalPath = join(root, ".env.local");
const PORT = 9876;
const STATE = randomBytes(16).toString("hex");
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;

const manifest = {
	name: "afenda-lite-docs-feedback",
  url: "https://github.com/pohlai88/afenda-lite",
  description: "Creates GitHub Discussions from @afenda/docs page/block feedback.",
  redirect_url: REDIRECT,
  public: false,
  default_permissions: {
    discussions: "write",
    metadata: "read",
  },
};

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
  } else if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" });
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  }
}

function escapePemForEnv(pem) {
  return pem.replace(/\r\n/g, "\n").replace(/\n/g, "\\n");
}

function upsertEnvLocal(appId, pem) {
  const idLine = `GITHUB_APP_ID=${appId}`;
  const keyLine = `GITHUB_APP_PRIVATE_KEY="${escapePemForEnv(pem)}"`;
  let body = existsSync(envLocalPath) ? readFileSync(envLocalPath, "utf8") : "";
  if (!body.endsWith("\n") && body.length > 0) body += "\n";
  const without = body
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("GITHUB_APP_ID=") && !line.startsWith("GITHUB_APP_PRIVATE_KEY="))
    .join("\n");
  const next = `${without.replace(/\n+$/, "")}\n\n# @afenda/docs feedback (GitHub App)\n${idLine}\n${keyLine}\n`;
  writeFileSync(envLocalPath, next.startsWith("\n") ? next.slice(1) : next, "utf8");
}

function runGhApi(args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.GITHUB_TOKEN;
    delete env.GH_TOKEN;
    const child = spawn(process.execPath, [join(root, "scripts", "gh.mjs"), "api", ...args], {
      cwd: root,
      env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += String(c); });
    child.stderr.on("data", (c) => { stderr += String(c); });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || stdout || `gh api exit ${code}`));
      else resolve(stdout);
    });
  });
}

const registerHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Register Afenda Docs Feedback App</title></head><body>
<p>Redirecting to GitHub App registration…</p>
<form id="f" action="https://github.com/settings/apps/new?state=${STATE}" method="post">
<input type="hidden" name="manifest" id="manifest" />
<noscript><button type="submit">Continue to GitHub</button></noscript>
</form>
<script>
document.getElementById("manifest").value = ${JSON.stringify(JSON.stringify(manifest))};
document.getElementById("f").submit();
</script></body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/" || url.pathname === "/register") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(registerHtml);
    return;
  }
  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || state !== STATE) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing code or invalid state.");
      return;
    }
    try {
      const raw = await runGhApi(["-X", "POST", `app-manifests/${code}/conversions`]);
      const converted = JSON.parse(raw);
      const appId = String(converted.id);
      const pem = converted.pem;
      const slug = converted.slug;
      if (!appId || !pem || !slug) throw new Error("Conversion response missing id, pem, or slug");
      upsertEnvLocal(appId, pem);
      const installUrl = `https://github.com/apps/${slug}/installations/new/permissions?target_id=216658843`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html><body>
<h1>App registered</h1>
<p>Wrote GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY to .env.local.</p>
<p><a href="${installUrl}">Install on pohlai88/afenda-lite</a></p>
<script>window.open(${JSON.stringify(installUrl)}, "_blank");</script>
</body></html>`);
      console.log(`OK app_id=${appId} slug=${slug}`);
      console.log(`Install: ${installUrl}`);
      setTimeout(() => { server.close(); process.exit(0); }, 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Conversion failed: ${message}`);
      console.error(message);
      setTimeout(() => { server.close(); process.exit(1); }, 500);
    }
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  const registerUrl = `http://127.0.0.1:${PORT}/register`;
  console.log(`Manifest callback on ${REDIRECT}`);
  console.log(`Open: ${registerUrl}`);
  console.log("GitHub UI: confirm name → Create GitHub App");
  openBrowser(registerUrl);
});

