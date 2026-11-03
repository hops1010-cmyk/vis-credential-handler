import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { RecordStore } from "./lib/store.mjs";
import { createVault } from "./lib/vault.mjs";
import { timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";
const root = path.dirname(fileURLToPath(import.meta.url));
export function sqliteAdapter(db) {
  return {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              return db.prepare(sql).get(...values) ?? null;
            },
            async run() {
              const r = db.prepare(sql).run(...values);
              return { meta: { changes: Number(r.changes) } };
            },
            async all() {
              return { results: db.prepare(sql).all(...values) };
            },
          };
        },
      };
    },
  };
}
export function cloudflareToken() {
  const file = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".wrangler",
    "config",
    "default.toml",
  );
  if (!fs.existsSync(file)) return null;
  return (
    fs.readFileSync(file, "utf8").match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1] ||
    null
  );
}
export async function startServer({
  port = Number(process.env.VAULT_PORT || 3215),
  privateDir = path.join(root, ".vault"),
  testDependencies,
} = {}) {
  const cfgFile = path.join(privateDir, "runtime.json");
  if (!fs.existsSync(cfgFile))
    throw Error(
      "Run npm run provision first; no private vault is initialized.",
    );
  const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  const origin = `http://localhost:${port}`;
  const db = new DatabaseSync(path.join(privateDir, "vault.sqlite"));
  db.exec(fs.readFileSync(path.join(root, "migrations", "0001.sql"), "utf8"));
  db.exec("PRAGMA journal_mode=WAL;");
  const store = new RecordStore(sqliteAdapter(db));
  const sendMail = async (email, code) => {
    const token = cloudflareToken();
    if (!token) throw Error("Mail authorization unavailable");
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfg.cfAccountId}/email/sending/send`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer " + token,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: "cody-vault@vistamations.com",
          to: email,
          subject: "VISTAMATIONS · Your vault sign-in code",
          text: `Your one-time code is ${code}. It expires in ten minutes. If you did not request this, ignore it.`,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const result = await r.json();
    if (!r.ok || result.success !== true)
      throw Error("Mail delivery unavailable");
  };
  const verifyCaptcha = async (token) => {
    if (!cfg.turnstileSecret || !token || token.length > 2048) return false;
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: cfg.turnstileSecret,
          response: token,
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
    const j = await r.json();
    return (
      r.ok &&
      j.success === true &&
      j.action === "vault_login" &&
      j.hostname === "localhost"
    );
  };
  const handle = createVault({
    store,
    masterKey: cfg.masterKey,
    origin,
    sendMail,
    verifyCaptcha,
    captchaSitekey: cfg.turnstileSitekey || "",
    mailReady: !!cfg.cfAccountId && !!cloudflareToken(),
    captchaReady: !!cfg.turnstileSecret,
    publicOrigin: cfg.publicOrigin || null,
    capturePage: async () => {
      const require = createRequire(import.meta.url);
      const { chromium } = require("playwright");
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(origin + "/ui", {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        return await page.screenshot({ fullPage: false });
      } finally {
        await browser.close();
      }
    },
    ...testDependencies,
  });
  const publicHandle = cfg.publicOrigin
    ? createVault({
        store,
        masterKey: cfg.masterKey,
        origin: cfg.publicOrigin,
        remote: true,
        cookiePath: "/cody-vault",
        sendMail: async () => {
          throw Error("Use local email verification");
        },
        verifyCaptcha: async () => false,
      })
    : null;
  const validBridge = (value) =>
    typeof value === "string" &&
    typeof cfg.originAuth === "string" &&
    Buffer.byteLength(value) === Buffer.byteLength(cfg.originAuth) &&
    timingSafeEqual(Buffer.from(value), Buffer.from(cfg.originAuth));
  const staticFiles = {
    "/": "public/shell.html",
    "/ui": "public/index.html",
    "/app.js": "public/app.js",
    "/style.css": "public/style.css",
    "/motion.js": "public/motion.js",
    "/gsap.min.js": "node_modules/gsap/dist/gsap.min.js",
    "/symbols.svg": "public/symbols.svg",
    "/shell.js": "public/shell.js",
    "/shell.css": "public/shell.css",
  };
  const security = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "SAMEORIGIN",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy":
      "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
  };
  const server = http.createServer(async (req, res) => {
    try {
      if (req.headers.host !== `localhost:${port}`) {
        res.writeHead(403, security);
        res.end("Use the localhost address.");
        return;
      }
      const url = new URL(req.url, origin);
      const bridgedHeader = req.headers["x-cody-origin-key"];
      const bridged = validBridge(bridgedHeader);
      if (bridgedHeader && !bridged) {
        res.writeHead(403, security);
        res.end("Bridge not authorized");
        return;
      }
      if (url.pathname === "/status/health") {
        res.writeHead(200, { ...security, "content-type": "application/json" });
        res.end(
          JSON.stringify({
            online: true,
            transport: "one-tunnel",
            channels: ["interface", "vault-api", "headless", "status"],
            sessionHistoryStored: false,
          }),
        );
        return;
      }
      if (
        url.pathname.startsWith("/api/") ||
        url.pathname === "/browser/capture"
      ) {
        const parts = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 32768) {
            res.writeHead(413, security);
            res.end("Request too large");
            return;
          }
          parts.push(chunk);
        }
        const destination = new URL(
          (url.pathname === "/browser/capture"
            ? "/api/browser/capture"
            : url.pathname) + url.search,
          bridged ? cfg.publicOrigin : origin,
        );
        const request = new Request(destination, {
          method: req.method,
          headers: req.headers,
          ...(req.method === "GET" || req.method === "HEAD"
            ? {}
            : { body: Buffer.concat(parts) }),
        });
        const response = await (bridged ? publicHandle : handle)(request);
        res.writeHead(response.status, {
          ...security,
          ...Object.fromEntries(response.headers),
        });
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, security);
        res.end();
        return;
      }
      const relative = staticFiles[url.pathname];
      if (!relative) {
        res.writeHead(404, security);
        res.end("Not found");
        return;
      }
      const mime = relative.endsWith(".html")
        ? "text/html; charset=utf-8"
        : relative.endsWith(".css")
          ? "text/css"
          : relative.endsWith(".svg")
            ? "image/svg+xml"
            : "text/javascript";
      res.writeHead(200, { ...security, "content-type": mime });
      let contents = fs.readFileSync(path.join(root, relative));
      if (bridged && relative.endsWith(".html"))
        contents = Buffer.from(
          contents
            .toString("utf8")
            .replace("<head>", '<head><base href="/cody-vault/">'),
        );
      res.end(req.method === "HEAD" ? undefined : contents);
    } catch {
      if (!res.headersSent) res.writeHead(500, security);
      res.end("The action could not complete.");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    server,
    store,
    db,
    origin,
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          db.close();
          resolve();
        }),
      ),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  startServer()
    .then(({ origin }) =>
      console.log(
        "Cody vault running at " +
          origin +
          " — PINs and secrets are never logged.",
      ),
    )
    .catch(() => {
      console.error(
        "Vault startup failed. Check local provisioning and port availability.",
      );
      process.exitCode = 1;
    });
