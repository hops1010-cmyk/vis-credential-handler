import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = [
  "README.md",
  "PLAN.md",
  "SPEC.md",
  "MENU-SPEC.md",
  "BUILD-DESIGN.md",
  "DEPLOYMENT.md",
];
const docs = Object.fromEntries(
  names.map((n) => [n, fs.readFileSync(path.join(root, n), "utf8")]),
);
const payload = JSON.stringify({
  app: "vis-credential-handler",
  schemaVersion: 1,
  phase: "local build",
  docs,
  configuration: {
    localPort: 3215,
    publicRoute: "https://www.vistamations.com/cody-vault",
    secretStorage: "private local directory; values excluded",
    captchaAction: "vault_login",
  },
});
const hash = createHash("sha256").update(payload).digest("hex");
const id = "vis-credential-handler-" + hash.slice(0, 16);
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const sql =
  "CREATE TABLE IF NOT EXISTS vis_app_spec_backups (id TEXT PRIMARY KEY,app TEXT NOT NULL,created_at TEXT NOT NULL,git_commit TEXT NOT NULL,sha256 TEXT NOT NULL,payload TEXT NOT NULL);\n" +
  `INSERT OR IGNORE INTO vis_app_spec_backups VALUES(${quote(id)},'vis-credential-handler',${quote(new Date().toISOString())},${quote(commit)},${quote(hash)},${quote(payload)});\n`;
const file = path.join(root, ".vault", "spec-backup.sql");
fs.writeFileSync(file, sql);
const cli = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
function run(args) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      WRANGLER_WRITE_LOGS: "false",
    },
  });
}
try {
  run([
    "d1",
    "execute",
    "tower8b-backup",
    "--remote",
    "--file",
    file,
    "--json",
  ]);
  const out = JSON.parse(
    run([
      "d1",
      "execute",
      "tower8b-backup",
      "--remote",
      "--command",
      `SELECT id,sha256 FROM vis_app_spec_backups WHERE id=${quote(id)}`,
      "--json",
    ]),
  );
  const rows = out.flatMap((x) => x.results || []);
  if (!rows.some((x) => x.id === id && x.sha256 === hash))
    throw Error("Read-back mismatch");
  const result = {
    id,
    sha256: hash,
    database: "tower8b-backup",
    table: "vis_app_spec_backups",
    verified: true,
    scope: "non-secret configuration and specification only",
    credentialDataIncluded: false,
    restoreTested: false,
  };
  fs.writeFileSync(
    path.join(root, ".vault", "spec-backup-receipt.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} catch {
  console.error(
    "D1 specification backup was not verified; no backup success claimed.",
  );
  process.exitCode = 1;
}
