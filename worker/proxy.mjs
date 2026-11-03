const prefix = "/cody-vault";
const publicHost = "www.vistamations.com";
const error = (message, status) =>
  Response.json(
    { error: message },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
  );
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      url.hostname !== publicHost ||
      !(url.pathname === prefix || url.pathname.startsWith(prefix + "/"))
    )
      return error("Not found", 404);
    if (url.pathname === prefix)
      return Response.redirect("https://" + publicHost + prefix + "/", 308);
    const suffix = url.pathname.slice(prefix.length);
    const api = suffix.startsWith("/api/");
    const browser = suffix === "/browser/capture";
    const status = suffix === "/status/health";
    const ui = new Set([
      "/",
      "/ui",
      "/app.js",
      "/style.css",
      "/motion.js",
      "/gsap.min.js",
      "/symbols.svg",
      "/shell.js",
      "/shell.css",
    ]);
    if (!api && !browser && !status && !ui.has(suffix))
      return error("Not found", 404);
    if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      request.method !== "POST"
    )
      return error("Method not allowed", 405);
    if (
      request.method === "POST" &&
      request.headers.get("origin") !== url.origin
    )
      return error("Origin not allowed", 403);
    if (!env.ORIGIN_AUTH || !env.CODY_ORIGIN)
      return error("Local bridge is not configured", 503);
    const headers = new Headers({
      "x-cody-origin-key": env.ORIGIN_AUTH,
      "x-cody-channel": api
        ? "vault-api"
        : browser
          ? "headless"
          : status
            ? "status"
            : "interface",
    });
    for (const name of ["content-type", "origin"])
      if (request.headers.has(name))
        headers.set(name, request.headers.get(name));
    const session = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)cody_vault=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (session) headers.set("cookie", "cody_vault=" + session);
    const destination = new URL("http://localhost:3215" + suffix + url.search);
    try {
      const response = await env.CODY_ORIGIN.fetch(
        new Request(destination, {
          method: request.method,
          headers,
          body:
            request.method === "GET" || request.method === "HEAD"
              ? undefined
              : request.body,
          redirect: "manual",
        }),
      );
      const out = new Response(response.body, response);
      out.headers.set("cache-control", "no-store");
      out.headers.set("x-cody-channel", headers.get("x-cody-channel"));
      return out;
    } catch {
      return error(
        "The local vault connection is unavailable. The vault remains locked.",
        503,
      );
    }
  },
};
