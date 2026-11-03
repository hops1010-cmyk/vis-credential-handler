import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomInt } from "node:crypto";
import fs from "node:fs";
import { RecordStore } from "../lib/store.mjs";
import { createVault } from "../lib/vault.mjs";
import { sqliteAdapter } from "../server.mjs";
import proxy from "../worker/proxy.mjs";
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    fs.readFileSync(new URL("../migrations/0001.sql", import.meta.url), "utf8"),
  );
  const store = new RecordStore(sqliteAdapter(db));
  const key = randomBytes(32).toString("hex");
  let code;
  const pin = String(randomInt(1000, 10000));
  const localOrigin = "http://localhost:3994",
    publicOrigin = "https://www.vistamations.com";
  const local = createVault({
    store,
    masterKey: key,
    origin: localOrigin,
    publicOrigin,
    mailReady: true,
    captchaReady: true,
    verifyCaptcha: async (x) => x === "isolated-test",
    sendMail: async (_, c) => {
      code = c;
    },
  });
  const remote = createVault({
    store,
    masterKey: key,
    origin: publicOrigin,
    remote: true,
    cookiePath: "/cody-vault",
  });
  const caller = (handler, origin) => {
    let cookie = "";
    return async (route, body) => {
      const response = await handler(
        new Request(origin + "/api/" + route, {
          method: body === undefined ? "GET" : "POST",
          headers: { cookie, origin, "content-type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
      if (response.headers.get("set-cookie"))
        cookie = response.headers.get("set-cookie").split(";")[0];
      return {
        status: response.status,
        headers: response.headers,
        body: await response.json(),
      };
    };
  };
  const l = caller(local, localOrigin),
    r = caller(remote, publicOrigin);
  async function unlock() {
    await l("session", {});
    await l("setup", { pin, confirm: pin });
    await l("pin", { pin });
    await l("images", {
      answers: ["dinosaur", "tower", "archetype", "system"],
    });
    await l("email", { email: "owner@example.test" });
    await l("captcha", { token: "isolated-test" });
    await l("verify-email", { code });
    const final = await l("finish", {});
    assert.equal(final.status, 200);
    return new URL(final.body.handoffUrl).hash.slice(9);
  }
  return { db, store, l, r, pin, unlock };
}
test("remote stays locked until local completion and one-use handoff", async () => {
  const f = fixture();
  try {
    assert.equal((await f.r("status")).body.step, "remote-locked");
    assert.equal((await f.r("session", {})).status, 403);
    assert.equal(
      (await f.r("handoff", { ticket: randomBytes(32).toString("hex") }))
        .status,
      403,
    );
    const ticket = await f.unlock();
    const accepted = await f.r("handoff", { ticket });
    assert.equal(accepted.status, 200);
    assert.match(accepted.headers.get("set-cookie"), /Path=\/cody-vault/);
    assert.match(accepted.headers.get("set-cookie"), /Secure/);
    assert.equal((await f.r("status")).body.greenZone, true);
    assert.equal((await f.r("handoff", { ticket })).status, 403);
    await f.l("logout", {});
    assert.equal((await f.r("secrets")).status, 401);
  } finally {
    f.db.close();
  }
});
test("PIN exit removes linked sessions and chat state but preserves saved notes", async () => {
  const f = fixture();
  try {
    const ticket = await f.unlock();
    await f.r("handoff", { ticket });
    await f.r("notes/save", {
      dashboard: "green-zone",
      text: "Synthetic encrypted note",
    });
    const stored = await f.store.get("note:green-zone");
    assert(!JSON.stringify(stored).includes("Synthetic encrypted note"));
    const bad = await f.r("exit", { pin: "not-a-pin" });
    assert.equal(bad.status, 403);
    assert.equal((await f.r("chat", { message: "test" })).status, 503);
    assert.equal((await f.store.list("chat:")).length, 0);
    const result = await f.r("exit", { pin: f.pin });
    assert.equal(result.status, 200);
    assert.equal(result.body.chatHistoryRetained, false);
    assert.equal((await f.store.list("session:")).length, 0);
    assert.equal((await f.store.list("handoff:")).length, 0);
    assert(await f.store.get("note:green-zone"));
    assert.equal((await f.r("secrets")).status, 401);
  } finally {
    f.db.close();
  }
});
test("edge proxy limits host/path, checks origin and uses a private fixed upstream", async () => {
  let target;
  let forwarded;
  const env = {
    ORIGIN_AUTH: randomBytes(32).toString("hex"),
    CODY_ORIGIN: {
      fetch: async (req) => {
        target = req.url;
        forwarded = req.headers;
        return new Response("ok");
      },
    },
  };
  assert.equal(
    (await proxy.fetch(new Request("https://other.example/cody-vault/"), env))
      .status,
    404,
  );
  assert.equal(
    (
      await proxy.fetch(
        new Request("https://www.vistamations.com/cody-vaultish/"),
        env,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await proxy.fetch(
        new Request("https://www.vistamations.com/cody-vault/api/setup", {
          method: "POST",
        }),
        env,
      )
    ).status,
    403,
  );
  const r = await proxy.fetch(
    new Request("https://www.vistamations.com/cody-vault/status/health", {
      headers: {
        cookie:
          "unrelated=private; cody_vault=" + randomBytes(32).toString("hex"),
      },
    }),
    env,
  );
  assert.equal(r.status, 200);
  assert.equal(target, "http://localhost:3215/status/health");
  assert(!forwarded.get("cookie").includes("unrelated"));
  assert.equal(r.headers.get("x-cody-channel"), "status");
  assert(![...r.headers].some(([key]) => key === "x-cody-origin-key"));
});
