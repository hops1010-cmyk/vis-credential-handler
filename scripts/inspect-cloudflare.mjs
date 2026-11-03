// Read-only account/routing metadata; never prints authorization tokens or DNS content.
import { cloudflareToken } from "../server.mjs";
const token = cloudflareToken();
if (!token) {
  console.log(JSON.stringify({ authorized: false }));
  process.exit(1);
}
const account = "a3cfe4297f6a3fedf411ba7e7d6f2751";
async function get(endpoint) {
  const response = await fetch(
    "https://api.cloudflare.com/client/v4/" + endpoint,
    {
      headers: { authorization: "Bearer " + token },
      signal: AbortSignal.timeout(20000),
    },
  );
  const j = await response.json();
  return {
    status: response.status,
    success: j.success,
    data: j.result,
    errors: j.errors?.map((e) => ({ code: e.code, message: e.message })),
  };
}
const zones = await get("zones?name=vistamations.com");
console.log(
  JSON.stringify({
    kind: "zone",
    status: zones.status,
    success: zones.success,
    zones: Array.isArray(zones.data)
      ? zones.data.map((z) => ({ id: z.id, name: z.name, status: z.status }))
      : [],
    errors: zones.errors,
  }),
);
const tunnels = await get(
  "accounts/" + account + "/cfd_tunnel?is_deleted=false",
);
console.log(
  JSON.stringify({
    kind: "tunnels",
    status: tunnels.status,
    success: tunnels.success,
    tunnels: Array.isArray(tunnels.data)
      ? tunnels.data.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          remoteConfig: t.remote_config,
        }))
      : [],
    errors: tunnels.errors,
  }),
);
if (zones.success && zones.data?.[0]) {
  const id = zones.data[0].id;
  const routes = await get("zones/" + id + "/workers/routes");
  console.log(
    JSON.stringify({
      kind: "routes",
      status: routes.status,
      success: routes.success,
      routes: routes.data,
      errors: routes.errors,
    }),
  );
  const dns = await get(
    "zones/" + id + "/dns_records?name=cody-origin.vistamations.com",
  );
  console.log(
    JSON.stringify({
      kind: "origin-dns",
      status: dns.status,
      success: dns.success,
      records: Array.isArray(dns.data)
        ? dns.data.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            proxied: d.proxied,
          }))
        : [],
      errors: dns.errors,
    }),
  );
}
