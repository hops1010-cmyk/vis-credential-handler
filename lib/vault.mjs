const enc = new TextEncoder();
const toHex = (b) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join(
    "",
  );
const fromHex = (s) =>
  Uint8Array.from(s.match(/../g) || [], (x) => parseInt(x, 16));
export const randomToken = () =>
  toHex(crypto.getRandomValues(new Uint8Array(32)));
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const imageNames = ["dinosaur", "tower", "archetype", "system"];
export function createVault({
  store,
  masterKey,
  origin,
  sendMail,
  verifyCaptcha,
  captchaSitekey = "",
  mailReady = false,
  captchaReady = false,
  now = () => Date.now(),
}) {
  const keyBytes = fromHex(masterKey);
  const hmacKey = crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const aesKey = crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  const sign = async (text) =>
    toHex(await crypto.subtle.sign("HMAC", await hmacKey, enc.encode(text)));
  const check = async (text, signature) =>
    typeof signature === "string" &&
    crypto.subtle.verify(
      "HMAC",
      await hmacKey,
      fromHex(signature),
      enc.encode(text),
    );
  const pinHash = async (pin, salt) => {
    const peppered = await sign("pin:" + pin);
    const material = await crypto.subtle.importKey(
      "raw",
      enc.encode(peppered),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    return toHex(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: fromHex(salt),
          iterations: 100000,
        },
        material,
        256,
      ),
    );
  };
  const seal = async (id, value) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: enc.encode(id) },
      await aesKey,
      enc.encode(JSON.stringify(value)),
    );
    return { iv: toHex(iv), ciphertext: toHex(data) };
  };
  const unseal = async (id, value) =>
    JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: fromHex(value.iv),
            additionalData: enc.encode(id),
          },
          await aesKey,
          fromHex(value.ciphertext),
        ),
      ),
    );
  const rate = async (name, limit, windowMs) => {
    await store.mutate("rate:" + name, (previous) => {
      const value =
        previous && previous.until > now()
          ? previous
          : { count: 0, until: now() + windowMs };
      if (value.count >= limit)
        fail("Too many attempts. Wait before retrying.", 429);
      return { ...value, count: value.count + 1 };
    });
  };
  const json = (data, status = 200, cookie) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        ...(cookie ? { "set-cookie": cookie } : {}),
      },
    });
  const cookie = (value, age) =>
    `cody_vault=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${origin.startsWith("https:") ? "; Secure" : ""}`;
  async function session(req) {
    const token = req.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)cody_vault=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (!token) fail("Start a private session first.", 401);
    const id = "session:" + (await sign(token));
    const found = await store.get(id);
    if (!found || found.value.expires < now() || found.value.revoked)
      fail("Session expired. Sign in again.", 401);
    return { id, ...found.value };
  }
  const saveSession = async (s, patch) => {
    await store.mutate(s.id, (current) => {
      if (!current || current.revoked || current.expires < now())
        fail("Session expired.", 401);
      return { ...current, ...patch };
    });
  };
  const authorized = async (req) => {
    const s = await session(req);
    if (!s.unlocked) fail("Complete the wizard first.", 401);
    return s;
  };
  const csrf = (req) => {
    if (req.headers.get("origin") !== origin) fail("Origin not allowed.", 403);
  };
  return async function handle(req) {
    try {
      const path = new URL(req.url).pathname;
      if (req.method === "GET" && path === "/api/status") {
        const cfg = (await store.get("config"))?.value;
        let s;
        try {
          s = await session(req);
        } catch {}
        return json({
          configured: !!cfg?.pinHash,
          ownerEnrolled: !!cfg?.owner,
          sessionActive: !!s,
          unlocked: !!s?.unlocked,
          step: s?.unlocked
            ? "vault"
            : s?.email
              ? 8
              : s?.imagesPassed
                ? 7
                : s?.pinPassed
                  ? 6
                  : cfg?.pinHash
                    ? 5
                    : 1,
          captchaSitekey,
          mailReady,
          captchaReady,
          images: imageNames,
        });
      }
      if (req.method === "GET" && path === "/api/secrets") {
        await authorized(req);
        const rows = await store.list("secret:");
        const result = [];
        for (const r of rows) {
          if (r.value.deleted) continue;
          const v = await unseal(r.id, r.value);
          result.push({
            id: r.id.slice(7),
            name: v.name,
            kind: v.kind,
            updatedAt: v.updatedAt,
          });
        }
        return json({ items: result });
      }
      if (req.method !== "POST") return json({ error: "Not found" }, 404);
      csrf(req);
      if (!req.headers.get("content-type")?.startsWith("application/json"))
        fail("JSON required.", 415);
      const raw = await req.text();
      if (raw.length > 32768) fail("Request too large.", 413);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        fail("Invalid JSON");
      }
      if (path === "/api/session") {
        await rate("session", 30, 600000);
        const token = randomToken();
        const cfg = (await store.get("config"))?.value;
        const current = {
          expires: now() + 900000,
          bootstrap: !cfg?.pinHash,
          pinPassed: false,
          imagesPassed: false,
          unlocked: false,
        };
        await store.set("session:" + (await sign(token)), current);
        return json({ ok: true }, 200, cookie(token, 900));
      }
      if (path === "/api/setup") {
        const s = await session(req);
        if (!s.bootstrap) fail("Setup unavailable.", 403);
        if (!/^\d{4}$/.test(body.pin ?? "") || body.pin !== body.confirm)
          fail("Enter the same four digits twice.");
        const salt = randomToken();
        const hash = await pinHash(body.pin, salt);
        await store.mutate("config", (cfg) => {
          if (cfg?.pinHash) fail("Vault is already configured.", 409);
          return {
            schemaVersion: 1,
            bootstrapSession: s.id,
            pinSalt: salt,
            pinHash: hash,
            skin: [
              "enterprise",
              "medieval",
              "kittens",
              "retro",
              "space",
              "savanna",
            ].includes(body.skin)
              ? body.skin
              : "enterprise",
            owner: null,
          };
        });
        return json({ ok: true, step: 5 });
      }
      if (path === "/api/pin") {
        const s = await session(req);
        await rate("pin", 5, 600000);
        const cfg = (await store.get("config"))?.value;
        if (!cfg?.pinHash) fail("Set the agent PIN privately first.", 409);
        if (!/^\d{4}$/.test(body.pin ?? "")) fail("PIN not accepted.", 403);
        const actual = await pinHash(body.pin, cfg.pinSalt);
        if (!(await check(actual, await sign(cfg.pinHash))))
          fail("PIN not accepted.", 403);
        await saveSession(s, {
          pinPassed: true,
          imagesPassed: false,
          unlocked: false,
        });
        return json({ ok: true, step: 6 });
      }
      if (path === "/api/images") {
        const s = await session(req);
        if (!s.pinPassed) fail("Complete step 5 first.", 403);
        await rate("images:" + s.id, 8, 600000);
        if (
          !Array.isArray(body.answers) ||
          body.answers.length !== 4 ||
          !body.answers.every(
            (x, i) => String(x).trim().toLowerCase() === imageNames[i],
          )
        )
          fail("The four image names do not match.", 403);
        await saveSession(s, { imagesPassed: true });
        return json({ ok: true, step: 7 });
      }
      if (path === "/api/email") {
        const s = await session(req);
        if (!s.imagesPassed) fail("Complete the image step first.", 403);
        const email = String(body.email ?? "")
          .trim()
          .toLowerCase();
        if (email.length > 254 || !/^\S+@[^@\s]+\.[^@\s]+$/.test(email))
          fail("Enter an email address.");
        const cfg = (await store.get("config"))?.value;
        if (cfg.owner) {
          const owner = await unseal("owner", cfg.owner);
          if (!(await check(email, await sign(owner.email))))
            fail("Use the vault owner email.", 403);
        } else if (!s.bootstrap || cfg.bootstrapSession !== s.id)
          fail("Finish first-run setup in the original private session.", 403);
        await saveSession(s, {
          email: await seal("email:" + s.id, { email }),
          captchaPassed: false,
        });
        return json({ ok: true, step: 8 });
      }
      if (path === "/api/captcha") {
        const s = await session(req);
        if (!s.email || !s.imagesPassed || !s.pinPassed)
          fail("Complete the preceding steps.", 403);
        if (!captchaReady || !mailReady)
          fail(
            "Email or CAPTCHA is not configured. No access was granted.",
            503,
          );
        await rate("mail", 5, 600000);
        if (!(await verifyCaptcha(String(body.token ?? ""))))
          fail("CAPTCHA was not accepted. Please retry.", 403);
        const array = crypto.getRandomValues(new Uint32Array(1));
        const code = String(array[0] % 1000000).padStart(6, "0");
        const email = (await unseal("email:" + s.id, s.email)).email;
        await saveSession(s, {
          codeHash: await sign("email-code:" + s.id + ":" + code),
          codeExpires: now() + 600000,
          captchaPassed: true,
          emailVerified: false,
        });
        try {
          await sendMail(email, code);
        } catch {
          await saveSession(s, { codeHash: null, captchaPassed: false });
          fail(
            "Email could not be sent. Retry without closing your session.",
            502,
          );
        }
        return json({ ok: true, codeSent: true });
      }
      if (path === "/api/verify-email") {
        const s = await session(req);
        if (!s.codeHash || !s.captchaPassed || s.codeExpires < now())
          fail("Request a fresh email code.", 403);
        await rate("code:" + s.id, 5, 600000);
        if (
          !/^\d{6}$/.test(body.code ?? "") ||
          !(await check("email-code:" + s.id + ":" + body.code, s.codeHash))
        )
          fail("Code not accepted.", 403);
        let consumed = false;
        await store.mutate(s.id, (current) => {
          if (
            !current ||
            current.revoked ||
            !current.codeHash ||
            current.emailVerified ||
            current.expires < now()
          )
            fail("Code already used or session expired.", 403);
          consumed = true;
          return { ...current, codeHash: null, emailVerified: true };
        });
        if (consumed) {
          const owner = await unseal("email:" + s.id, s.email);
          await store.mutate("config", async (cfg) => {
            if (cfg.owner) {
              const existing = await unseal("owner", cfg.owner);
              if (existing.email !== owner.email)
                fail("Owner already enrolled.", 403);
              return cfg;
            }
            return { ...cfg, owner: await seal("owner", owner) };
          });
          await saveSession(s, { ready: true });
        }
        return json({ ok: true, ready: true });
      }
      if (path === "/api/finish") {
        const s = await session(req);
        if (!s.ready || !s.emailVerified || !s.pinPassed || !s.imagesPassed)
          fail("Complete all verification first.", 403);
        const token = randomToken();
        const fresh = {
          expires: now() + 900000,
          unlocked: true,
          pinPassed: true,
          imagesPassed: true,
          emailVerified: true,
        };
        await store.mutate(s.id, (current) => {
          if (!current || current.revoked || !current.ready)
            fail("Completion already used.", 409);
          return { ...current, revoked: true };
        });
        await store.set("session:" + (await sign(token)), fresh);
        return json({ ok: true, unlocked: true }, 200, cookie(token, 900));
      }
      if (path === "/api/logout") {
        const s = await session(req);
        await saveSession(s, { revoked: true, unlocked: false });
        return json({ ok: true }, 200, cookie("", 0));
      }
      if (path === "/api/secrets/save") {
        await authorized(req);
        const id =
          body.id && /^[a-f0-9-]{36}$/.test(body.id)
            ? body.id
            : crypto.randomUUID();
        const name = String(body.name ?? "").trim();
        const value = String(body.value ?? "");
        const kind = ["password", "api-key", "note"].includes(body.kind)
          ? body.kind
          : "password";
        if (!name || name.length > 120 || !value || value.length > 16000)
          fail("Provide a name and a bounded secret value.");
        const key = "secret:" + id;
        await store.set(
          key,
          await seal(key, {
            name,
            value,
            kind,
            updatedAt: new Date(now()).toISOString(),
          }),
        );
        return json({ ok: true, id });
      }
      if (path === "/api/secrets/reveal") {
        await authorized(req);
        if (!/^[a-f0-9-]{36}$/.test(body.id ?? "")) fail("Invalid item");
        const key = "secret:" + body.id;
        const row = await store.get(key);
        if (!row || row.value.deleted) fail("Item not found", 404);
        return json(await unseal(key, row.value));
      }
      if (path === "/api/secrets/delete") {
        await authorized(req);
        if (!/^[a-f0-9-]{36}$/.test(body.id ?? "")) fail("Invalid item");
        await store.set("secret:" + body.id, { deleted: true });
        return json({ ok: true });
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json(
        {
          error: error.status
            ? error.message
            : "The action could not complete. Your vault remains locked.",
        },
        error.status || 500,
      );
    }
  };
}
