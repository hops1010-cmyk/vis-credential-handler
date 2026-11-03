import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const publicBase = "https://www.vistamations.com/cody-vault";
const localBase = "http://localhost:3215";
const report = {
  checkedAt: new Date().toISOString(),
  endpoints: [localBase + "/", publicBase],
  checks: [],
  realPinEntered: false,
  realEmailSent: false,
  privateRecordsRead: false,
};
for (const base of [localBase, publicBase]) {
  const health = await fetch(base + "/status/health");
  assert.equal(health.status, 200);
  const gate = await (await fetch(base + "/api/status")).json();
  assert.equal(gate.unlocked, false);
  report.checks.push({ endpoint: base, health: 200, locked: true });
}
const blocked = await fetch(publicBase + "/api/setup", {
  method: "POST",
  headers: {
    origin: "https://www.vistamations.com",
    "content-type": "application/json",
  },
  body: "{}",
});
assert.equal(blocked.status, 403);
report.checks.push({ publicBootstrapBlocked: true });
const capture = await fetch(publicBase + "/browser/capture", {
  method: "POST",
  headers: {
    origin: "https://www.vistamations.com",
    "content-type": "application/json",
  },
  body: "{}",
});
assert.equal(capture.status, 401);
report.checks.push({ headlessRequiresVerifiedSession: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(publicBase);
  const frame = page.frameLocator("#vaultFrame");
  await frame.getByRole("heading", { name: "Green Zone is locked." }).waitFor();
  assert.equal(
    await frame.getByRole("button", { name: "Begin private setup" }).count(),
    0,
  );
  await frame.getByRole("button", { name: "Preview skin motion" }).click();
  assert.match(await frame.locator("#message").textContent(), /preview/i);
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: "test-output/public-locked.png",
    fullPage: true,
  });
  report.checks.push({
    iframeLoads: true,
    remoteLockedUi: true,
    skinMotionAvailable: true,
    pageErrors: 0,
  });
} finally {
  await browser.close();
}
fs.writeFileSync(
  "test-output/live-boundary-result.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
