import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareToken } from "../server.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privateDir = path.join(root, ".vault");
const stateFile = path.join(privateDir, "bridge.json");
const state = fs.existsSync(stateFile)
  ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
  : {};
const account = "a3cfe4297f6a3fedf411ba7e7d6f2751";
const token = cloudflareToken();
async function api(method, endpoint, body) {
  const r = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" + account + "/" + endpoint,
    {
      method,
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25000),
    },
  );
  const j = await r.json();
  if (!r.ok || j.success !== true)
    throw Object.assign(Error("Cloudflare operation failed"), {
      endpoint,
      status: r.status,
      codes: j.errors?.map((e) => e.code),
    });
  return j.result;
}
function save() {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
}
try {
  if (!token) throw Error("Authorization missing");
  if (!state.tunnelId) {
    const tunnels = await api("GET", "cfd_tunnel?is_deleted=false");
    if (tunnels.some((t) => t.name === "cody-vault-bridge"))
      throw Error("Existing tunnel needs ownership review");
    const t = await api("POST", "cfd_tunnel", {
      name: "cody-vault-bridge",
      config_src: "cloudflare",
    });
    state.tunnelId = t.id;
    save();
  }
  if (!fs.existsSync(path.join(privateDir, "tunnel.token"))) {
    const tunnelToken = await api(
      "GET",
      "cfd_tunnel/" + state.tunnelId + "/token",
    );
    if (typeof tunnelToken !== "string" || tunnelToken.length < 30)
      throw Error("Tunnel token unavailable");
    fs.writeFileSync(path.join(privateDir, "tunnel.token"), tunnelToken, {
      mode: 0o600,
    });
  }
  await api("PUT", "cfd_tunnel/" + state.tunnelId + "/configurations", {
    config: {
      ingress: [{ service: "http_status:404" }],
      "warp-routing": { enabled: true },
    },
  });
  if (!state.serviceId) {
    const svc = await api("POST", "connectivity/directory/services", {
      name: "cody-vault-local-origin",
      type: "http",
      host: { ipv4: "127.0.0.1", network: { tunnel_id: state.tunnelId } },
      http_port: 3215,
    });
    state.serviceId = svc.service_id;
    save();
  }
  const config = {
    name: "vis-cody-vault-proxy",
    main: "worker/proxy.mjs",
    account_id: account,
    compatibility_date: "2026-11-03",
    workers_dev: false,
    preview_urls: false,
    routes: [
      {
        pattern: "www.vistamations.com/cody-vault",
        zone_name: "vistamations.com",
      },
      {
        pattern: "www.vistamations.com/cody-vault/*",
        zone_name: "vistamations.com",
      },
    ],
    vpc_services: [{ binding: "CODY_ORIGIN", service_id: state.serviceId }],
    observability: { enabled: false },
  };
  fs.writeFileSync(
    path.join(root, "wrangler.jsonc"),
    JSON.stringify(config, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      tunnelId: state.tunnelId,
      serviceId: state.serviceId,
      oneTunnel: true,
      dnsChanged: false,
      secretPrinted: false,
      configWritten: true,
    }),
  );
} catch (e) {
  console.error(
    JSON.stringify({
      provisioned: false,
      endpoint: e.endpoint,
      status: e.status,
      codes: e.codes,
      reason: e.status
        ? "Account operation rejected"
        : "Provisioning needs review; private response suppressed",
    }),
  );
  process.exitCode = 1;
}
