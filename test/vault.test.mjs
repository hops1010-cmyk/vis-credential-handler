import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomInt } from "node:crypto";
import fs from "node:fs";
import { RecordStore } from "../lib/store.mjs";
import { createVault } from "../lib/vault.mjs";
import { sqliteAdapter } from "../server.mjs";
function fixture({ captcha = true, clock } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(
    fs.readFileSync(new URL("../migrations/0001.sql", import.meta.url), "utf8"),
  );
  const store = new RecordStore(sqliteAdapter(db));
  let sentCode;
  let cookie = "";
  const origin = "http://localhost:3991";
  const handle = createVault({
    store,
    masterKey: randomBytes(32).toString("hex"),
    origin,
    captchaReady: true,
    mailReady: true,
    verifyCaptcha: async (token) => captcha && token === "isolated-test-token",
    sendMail: async (email, code) => {
      assert.equal(email, "owner@example.test");
      sentCode = code;
    },
    ...(clock ? { now: () => clock.time } : {}),
  });
  async function call(
    route,
    data,
    { originHeader = origin, useCookie = true } = {},
  ) {
    const r = await handle(
      new Request(origin + "/api/" + route, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          ...(useCookie ? { cookie } : {}),
          origin: originHeader,
          "content-type": "application/json",
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      }),
    );
    const value = await r.json();
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, value, headers: r.headers };
  }
  const pin = String(randomInt(1000, 10000));
  async function throughImages() {
    await call("session", {});
    assert.equal(
      (await call("setup", { pin, confirm: pin, skin: "enterprise" })).status,
      200,
    );
    assert.equal((await call("pin", { pin })).status, 200);
    assert.equal(
      (
        await call("images", {
          answers: ["dinosaur", "tower", "archetype", "system"],
        })
      ).status,
      200,
    );
  }
  async function ready() {
    await throughImages();
    assert.equal(
      (await call("email", { email: "owner@example.test" })).status,
      200,
    );
    assert.equal(
      (await call("captcha", { token: "isolated-test-token" })).status,
      200,
    );
    assert.equal((await call("verify-email", { code: sentCode })).status, 200);
  }
  return { db, store, call, pin, throughImages, ready, code: () => sentCode };
}
test("full sequence, one-time completion, encrypted CRUD and logout", async () => {
  const f = fixture();
  try {
    assert.equal((await f.call("finish", {})).status, 401);
    await f.ready();
    assert.equal(
      (await f.call("verify-email", { code: f.code() })).status,
      403,
    );
    const final = await f.call("finish", {});
    assert.equal(final.status, 200);
    assert.match(final.headers.get("set-cookie"), /HttpOnly/);
    assert.match(final.headers.get("set-cookie"), /SameSite=Strict/);
    assert.equal((await f.call("finish", {})).status, 403);
    const secret = "temporary-test-secret-" + randomBytes(16).toString("hex");
    const saved = await f.call("secrets/save", {
      name: "Temporary entry",
      kind: "password",
      value: secret,
    });
    assert.equal(saved.status, 200);
    const row = await f.store.get("secret:" + saved.value.id);
    assert(!JSON.stringify(row).includes(secret));
    assert(!JSON.stringify(row).includes("Temporary entry"));
    const list = await f.call("secrets");
    assert.equal(list.value.items.length, 1);
    assert(!JSON.stringify(list).includes(secret));
    assert.equal(
      (await f.call("secrets/reveal", { id: saved.value.id })).value.value,
      secret,
    );
    await f.call("secrets/delete", { id: saved.value.id });
    assert.equal((await f.call("secrets")).value.items.length, 0);
    assert.equal(
      (await f.call("secrets/reveal", { id: saved.value.id })).status,
      404,
    );
    await f.call("logout", {});
    assert.equal((await f.call("secrets")).status, 401);
  } finally {
    f.db.close();
  }
});
test("cannot skip PIN/images/email and wrong CAPTCHA fails closed", async () => {
  const f = fixture({ captcha: false });
  try {
    await f.call("session", {});
    assert.equal((await f.call("images", { answers: [] })).status, 403);
    assert.equal((await f.call("finish", {})).status, 403);
    await f.throughImages();
    assert.equal(
      (await f.call("email", { email: "owner@example.test" })).status,
      200,
    );
    assert.equal(
      (await f.call("captcha", { token: "forged-token" })).status,
      403,
    );
    assert.equal(f.code(), undefined);
    assert.equal((await f.call("finish", {})).status, 403);
  } finally {
    f.db.close();
  }
});
test("PIN verifier is private, wrong attempts bounded, bootstrap cannot overwrite", async () => {
  const f = fixture();
  try {
    await f.throughImages();
    const cfg = await f.store.get("config");
    assert(!JSON.stringify(cfg).includes('"pin":'));
    assert.notEqual(cfg.value.pinHash, f.pin);
    const status = await f.call("status");
    assert(!JSON.stringify(status).includes(cfg.value.pinHash));
    assert.equal(
      (await f.call("setup", { pin: f.pin, confirm: f.pin })).status,
      409,
    );
    const wrong = f.pin === "0000" ? "9999" : "0000";
    for (let i = 0; i < 4; i++)
      assert.equal((await f.call("pin", { pin: wrong })).status, 403);
    assert.equal((await f.call("pin", { pin: f.pin })).status, 429);
  } finally {
    f.db.close();
  }
});
test("cross-origin changes rejected and expired session cannot unlock", async () => {
  const clock = { time: Date.now() };
  const f = fixture({ clock });
  try {
    assert.equal(
      (
        await f.call(
          "session",
          {},
          { originHeader: "https://untrusted.example" },
        )
      ).status,
      403,
    );
    await f.throughImages();
    clock.time += 901000;
    assert.equal(
      (await f.call("email", { email: "owner@example.test" })).status,
      401,
    );
  } finally {
    f.db.close();
  }
});
test("another first-run session cannot claim the vault owner", async () => {
  const f = fixture();
  try {
    await f.throughImages();
    await f.call("session", {});
    assert.equal((await f.call("pin", { pin: f.pin })).status, 200);
    assert.equal(
      (
        await f.call("images", {
          answers: ["dinosaur", "tower", "archetype", "system"],
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.call("email", { email: "owner@example.test" })).status,
      403,
    );
  } finally {
    f.db.close();
  }
});
test("tampered encrypted data cannot be revealed", async () => {
  const f = fixture();
  try {
    await f.ready();
    await f.call("finish", {});
    const saved = await f.call("secrets/save", {
      name: "Temporary",
      value: "isolated-fixture-value",
    });
    const key = "secret:" + saved.value.id;
    const row = await f.store.get(key);
    row.value.ciphertext = "00" + row.value.ciphertext.slice(2);
    await f.store.set(key, row.value);
    assert.equal(
      (await f.call("secrets/reveal", { id: saved.value.id })).status,
      500,
    );
  } finally {
    f.db.close();
  }
});
