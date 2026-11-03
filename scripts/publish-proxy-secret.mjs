import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(
  fs.readFileSync(path.join(root, ".vault", "runtime.json"), "utf8"),
);
if (!/^[a-f0-9]{64}$/.test(cfg.originAuth ?? ""))
  throw Error("Private proxy authorization is not provisioned.");
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
      "secret",
      "put",
      "ORIGIN_AUTH",
      "--config",
      path.join(root, "wrangler.jsonc"),
    ],
    {
      cwd: root,
      input: cfg.originAuth + "\n",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        WRANGLER_WRITE_LOGS: "false",
        WRANGLER_LOG_SANITIZE: "true",
        WRANGLER_SEND_METRICS: "false",
      },
    },
  );
  console.log(
    JSON.stringify({
      worker: "vis-cody-vault-proxy",
      secretName: "ORIGIN_AUTH",
      stored: true,
      valuePrinted: false,
    }),
  );
} catch {
  console.error(
    "Private proxy secret publication was not verified; no value printed.",
  );
  process.exitCode = 1;
}
