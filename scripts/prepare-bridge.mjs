import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, ".vault", "runtime.json");
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
cfg.publicOrigin = "https://www.vistamations.com";
cfg.originAuth ||= randomBytes(32).toString("hex");
fs.writeFileSync(file, JSON.stringify(cfg, null, 2), { mode: 0o600 });
fs.writeFileSync(
  path.join(root, ".vault", "cloudflared.yml"),
  JSON.stringify({ "warp-routing": { enabled: true } }),
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    local: "http://localhost:3215/",
    public: "https://www.vistamations.com/cody-vault",
    secretPrinted: false,
  }),
);
