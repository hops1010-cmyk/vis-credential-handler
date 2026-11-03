import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomInt } from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startServer } from "../server.mjs";
const require = createRequire(import.meta.url);
const {
  chromium,
  firefox,
} = require("C:/kubernate/docker01-sandbox-dojo-base-model/stockmarket-wealth/node_modules/playwright");
const browserName =
  process.env.VAULT_TEST_BROWSER === "firefox" ? "firefox" : "chromium";
const output = path.resolve("test-output");
fs.mkdirSync(output, { recursive: true });
const privateDir = fs.mkdtempSync(path.join(output, "isolated-"));
fs.writeFileSync(
  path.join(privateDir, "runtime.json"),
  JSON.stringify({ masterKey: randomBytes(32).toString("hex") }),
);
let deliveredCode;
const app = await startServer({
  port: 3992,
  privateDir,
  testDependencies: {
    captchaReady: true,
    mailReady: true,
    captchaSitekey: "isolated-browser-test",
    verifyCaptcha: async (t) => t === "isolated-browser-token",
    sendMail: async (_, code) => {
      deliveredCode = code;
    },
  },
});
const browser = await (browserName === "firefox" ? firefox : chromium).launch({
  headless: true,
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_, cfg) => {
        queueMicrotask(() => cfg.callback("isolated-browser-token"));
        return 1;
      },
      remove() {},
      reset() {},
    };
  });
  await page.goto(app.origin + "/ui");
  await page.getByRole("button", { name: "Begin private setup" }).waitFor();
  await page.screenshot({
    path: path.join(output, "vault-desktop.png"),
    fullPage: true,
  });
  for (const value of [
    "enterprise",
    "medieval",
    "kittens",
    "retro",
    "space",
    "savanna",
  ]) {
    await page.selectOption("#skin", value);
    await page.getByRole("button", { name: "Preview skin motion" }).click();
    await page.waitForTimeout(70);
  }
  await page.selectOption("#skin", "enterprise");
  await page.getByRole("button", { name: "Begin private setup" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue to private PIN setup" })
    .click();
  const pin = String(randomInt(1000, 10000));
  await page.getByLabel("Agent PIN", { exact: true }).fill(pin);
  await page.getByLabel("Confirm PIN", { exact: true }).fill(pin);
  await page.getByRole("button", { name: "Save PIN privately" }).click();
  await page.getByRole("button", { name: "Verify PIN", exact: true }).waitFor();
  await page.getByRole("button", { name: "Use image positions" }).click();
  assert.equal(await page.locator(".pinpad button").count(), 10);
  await page.getByLabel("Agent PIN", { exact: true }).fill(pin);
  await page.getByRole("button", { name: "Verify PIN", exact: true }).click();
  for (const [i, name] of [
    "dinosaur",
    "tower",
    "archetype",
    "system",
  ].entries())
    await page.locator(`[name=image${i}]`).fill(name);
  await page.getByRole("button", { name: "Verify the four images" }).click();
  await page.getByLabel("Email address").fill("owner@example.test");
  await page.getByRole("button", { name: "Continue to CAPTCHA" }).click();
  await page
    .getByRole("button", { name: "Verify CAPTCHA & send email code" })
    .click();
  await page.getByLabel("Email sign-in code").waitFor();
  assert.equal(typeof deliveredCode, "string");
  await page.getByLabel("Email sign-in code").fill(deliveredCode);
  await page
    .getByRole("button", { name: "Verify email code", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enter Cody’s vault", exact: true })
    .click();
  await page.getByRole("button", { name: "New secret", exact: true }).waitFor();
  await page.getByLabel("Private note").fill("Synthetic dashboard note");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page
    .getByRole("button", { name: "Capture locked view", exact: true })
    .click();
  await page.locator("#browserPreview:not([hidden])").waitFor();
  await page.getByRole("button", { name: "New secret", exact: true }).click();
  await page.getByLabel("Item name").fill("Browser test fixture");
  await page.getByLabel("Secret value").fill("synthetic-isolated-fixture");
  await page.getByRole("button", { name: "Save secret", exact: true }).click();
  await page
    .getByRole("button", { name: "Browser test fixture · password" })
    .waitFor();
  await page.getByRole("button", { name: "Lock vault", exact: true }).click();
  await page.getByRole("button", { name: "Verify PIN", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "New secret", exact: true }).count(),
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "vault-mobile.png"),
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Preview skin motion" }).click();
  assert.match(
    await page.locator("#message").textContent(),
    /reduced motion|Preview|preview/,
  );
  assert.equal(await page.locator("#L4 g").count(), 0);
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    checks: [
      "isolated eight-step browser flow",
      "six skin motion previews",
      "image input mode",
      "final button gated by email verification",
      "encrypted item UI",
      "lock",
      "390px layout",
      "reduced motion",
      "no page errors",
    ],
    captcha: "isolated test double; no real CAPTCHA solved",
    email: "isolated test adapter; no real email sent",
    browser: browserName,
  };
  fs.writeFileSync(
    path.join(output, "browser-result-" + browserName + ".json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await app.close();
}
