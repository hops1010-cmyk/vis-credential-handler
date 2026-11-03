import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privateDir = path.join(root, ".vault");
fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
if (process.platform === "win32") {
  const identity = process.env.USERDOMAIN + "\\" + process.env.USERNAME;
  execFileSync(
    "icacls.exe",
    [
      privateDir,
      "/inheritance:r",
      "/grant:r",
      identity + ":(OI)(CI)F",
      "/grant:r",
      "*S-1-5-18:(OI)(CI)F",
    ],
    { stdio: "pipe", windowsHide: true },
  );
}
const file = path.join(privateDir, "runtime.json");
let cfg = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : { masterKey: randomBytes(32).toString("hex") };
// Account identifier is public routing metadata; credentials remain in Wrangler's private store.
cfg.cfAccountId = "a3cfe4297f6a3fedf411ba7e7d6f2751";
fs.writeFileSync(file, JSON.stringify(cfg, null, 2), { mode: 0o600 });
console.log(
  JSON.stringify({
    privateStorageInitialized: true,
    privateAclConfigured: process.platform === "win32",
    pinProvisioned: false,
    captchaProvisioned: !!cfg.turnstileSecret,
    emailDeliveryTested: false,
  }),
);
