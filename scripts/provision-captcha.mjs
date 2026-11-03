import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, ".vault", "runtime.json");
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
if (cfg.turnstileSecret) {
  console.log(JSON.stringify({ alreadyConfigured: true }));
  process.exit(0);
}
// The canonical CLI is outside this project. Capture JSON privately: it contains the widget secret.
const canonical = path.join(
  process.env.APPDATA,
  "npm",
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
try {
  const raw = execFileSync(
    process.execPath,
    [
      canonical,
      "turnstile",
      "widget",
      "create",
      "Cody vault localhost",
      "--domain",
      "localhost",
      "--domain",
      "127.0.0.1",
      "--mode",
      "managed",
      "--json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        WRANGLER_WRITE_LOGS: "false",
        WRANGLER_LOG_SANITIZE: "true",
      },
    },
  );
  let data = JSON.parse(raw.slice(raw.indexOf("{")));
  data = data.result || data;
  if (!data.sitekey || typeof data.secret !== "string" || !data.secret.trim())
    throw Error("Widget response missing required fields");
  cfg.turnstileSitekey = data.sitekey;
  cfg.turnstileSecret = data.secret;
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  console.log(
    JSON.stringify({
      configured: true,
      domains: ["localhost", "127.0.0.1"],
      sitekey: data.sitekey,
      secretStoredPrivately: true,
    }),
  );
} catch {
  console.error(
    "CAPTCHA setup was not verified. Private CLI output was suppressed; no fallback attempted.",
  );
  process.exitCode = 1;
}
