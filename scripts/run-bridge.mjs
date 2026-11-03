// One foreground supervisor owns both local service and its single tunnel connector.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { startServer } from "../server.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executable =
  process.platform === "win32"
    ? "C:/Program Files (x86)/cloudflared/cloudflared.exe"
    : "cloudflared";
const tokenFile = path.join(root, ".vault", "tunnel.token");
if (!fs.existsSync(tokenFile)) {
  console.error("Tunnel provisioning is required.");
  process.exit(1);
}
const app = await startServer();
let child;
let stopping = false;
let attempts = 0;
console.log(
  JSON.stringify({
    local: app.origin + "/",
    public: "https://www.vistamations.com/cody-vault",
    service: "started",
    secretsPrinted: false,
  }),
);
function start() {
  child = spawn(
    executable,
    [
      "--config",
      path.join(root, ".vault", "cloudflared.yml"),
      "--output",
      "json",
      "tunnel",
      "run",
      "--token-file",
      tokenFile,
    ],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  const onData = (chunk) => {
    for (const line of chunk.toString().split("\n")) {
      try {
        const item = JSON.parse(line);
        if (item.message === "Registered tunnel connection")
          console.log(
            JSON.stringify({
              tunnel: "connected",
              connection: item.connIndex,
              protocol: item.protocol,
            }),
          );
        else if (item.level === "error")
          console.log(
            JSON.stringify({
              tunnel: "error",
              detail:
                "Connector reported an error; no credential payload logged",
            }),
          );
      } catch {}
    }
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("error", () => console.error("Tunnel connector could not start."));
  child.on("exit", () => {
    if (!stopping && attempts++ < 3) setTimeout(start, 2000);
    else if (!stopping)
      console.error(
        "Tunnel connector stopped; local service remains available.",
      );
  });
}
async function stop() {
  if (stopping) return;
  stopping = true;
  child?.kill();
  await app.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
start();
