# Two-endpoint deployment — Cody vault

Verified 2026-11-03 UTC / 2026-11-04 Sydney. Pete explicitly requested localhost → www.vis, two points only, one tunnel, four proxy channels, headless browser, iframe/reverse proxy, public unlock from local wizard, Green Zone, PIN exit, chat interface and per-dashboard notes.

## Endpoints and transport

1. http://localhost:3215/ — authoritative local backend, encrypted SQLite/private key and local setup wizard.
2. https://www.vistamations.com/cody-vault — same vault through reverse proxy and a first-party iframe; no separate cloud secret database or third user-facing endpoint.

Worker vis-cody-vault-proxy owns only /cody-vault and /cody-vault/* on www.vistamations.com. workers.dev and preview URLs disabled. Named tunnel cody-vault-bridge connects one Cloudflare VPC Service to loopback port3215. Four registered QUIC connections observed. Existing www root/store/Madeline routes and DNS records were not replaced. Private VPC routing is used because current authorization can manage connectivity but DNS API access was denied; no DNS permission was worked around.

Four logical channels share that tunnel: interface/static assets, vault API, authenticated headless capture, and health/status. Channel boundaries are explicit, fixed-upstream and not an open HTTP proxy. Headless capture opens a fresh browser context on the local locked view; it cannot accept arbitrary destinations. The iframe hosts the actual vault interface with same-origin framing controls; it is not claimed as an independent identity/security boundary.

## Local approval activates a web session

The web endpoint cannot run setup/PIN/email/CAPTCHA steps or bootstrap an owner. Local wizard completion creates a short-lived single-use handoff. The browser carries it in a URL fragment (not query parameters) and consumes it through a same-origin POST. A Secure/HttpOnly/SameSite cookie is scoped to /cody-vault. The linked session validates its local parent on every protected call. Public visitors without a valid handoff/session remain locked; local completion never unlocks the vault for everyone.

Green Zone is shown only with verified session approval, not as a claim of universal safety. The exit PIN uses the privately configured agent PIN verifier; no accepted value is in public code. Exit removes the linked parent/child sessions, wizard record, handoff and temporary rate state. Saved encrypted items/notes remain. Wrong exit PIN does not end the session.

Chat interface is implemented without stored chat history, but **no live model/provider is configured**; it reports that fact instead of simulating Cody. Dashboard notes use explicit Save, encrypted at rest, keyed by dashboard ID. UI exposes Vault/Green Zone/Headless/Status notes; this does not automatically add widgets to every unrelated Tower app.

## Privacy and lifecycle

No application request/transcript logging added. Edge observability disabled following Pete's instruction; provider transport/control-plane metadata may still exist and no zero-tracking guarantee is made. Secrets, actual personal note data, root key, tunnel token and origin authorization remain private/ignored. Worker receives only origin-connection authorization, not the vault encryption key. No private contact note was uploaded to Git/D1 or duplicated in cloud storage.

An earlier hidden launch was rejected. The current explicitly requested setup uses one supervised foreground process running the local server and the connector; no hidden Windows service/startup task was installed. It is currently running under a managed tool session. It must remain running for the public connection to work; this is not reboot persistence. Start it with `node scripts/run-bridge.mjs` after provisioning. The supervisor retries connector exits and shuts down its owned processes on normal signals; no automatic tunnel replacement.

## Evidence and gaps

- Live local/public health endpoints: HTTP200, expected channels.
- Live public status: remote-locked, no private data; public setup HTTP403; unauthenticated headless capture HTTP401.
- Live public iframe and skin preview: working, no page errors in Chromium inspection.
- Nine backend tests pass, including handoff replay, local revocation, origin/path boundaries, exit cleanup, encrypted notes and existing vault checks.
- Isolated Firefox wizard, notes and actual fresh-context headless capture pass. Email/CAPTCHA were test adapters in these tests; no real PIN or real email was used.
- Real app PIN/owner enrolment remains unconfigured, real email delivery unverified. Turnstile creation/private write still awaits the earlier required confirmation under the turnstile-spin skill. Missing checks fail closed; the web app remains locked until the actual local wizard completes.
- No live chat model configured; broad agent provider-action/capability service remains a planned extension.
- Edge deployment code version 7ab0b5bd-4cab-4644-9c15-4e235bbb24de, active secret-change version 308b6950-6fb1-4d5e-bd7f-60c6d73f715d. Further local asset changes are served by the same reverse proxy; read actual Git history for source revision.

Quality: **89/100 for the deployed connection**, self-assessed. This score is not security strength. Live identity/approval completion, model connection and recovery/reboot persistence remain unverified or unconfigured.
