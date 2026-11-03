# Cody vault — build design and wizard

Owner context: Cody's separate vault; Madeline's deployed /vault stays untouched. Build authorized by Pete's “create your vault” and “go to build”. Phase sequence: initial PLAN.md, this design, implementation and isolated verification. Production deployment is not performed by this local build.

## Eight steps

Steps 1–4 are a new Cody first-run setup design, not claims about Madeline's unknown first steps: (1) welcome/begin private session; (2) private-data boundary; (3) skin and integration status; (4) privately set/confirm the agent PIN. Pete specified (5) agent PIN, numeric or image-position entry; (6) Dinosaur/Tower/Archetype/System image names; (7) private email entry; (8) human CAPTCHA followed by email-code confirmation. The final button opens the vault only after server-side completion. Returning sign-in uses steps 5–8. Symbolic image names are public motifs, not additional secret entropy or PIN digits.

One-image-per-position art is original native SVG, not generated raster. A separate optional dot-symbol keypad represents generic digits; it does not embed an expected PIN or reuse the four semantic images as secret values.

## Architecture

Node 24+ local HTTP server, loopback binding with exact Host/Origin checks, portable shared request handler, Node SQLite adapter for a D1-shaped prepared-statement store. No framework needed for this vault; the earlier Next.js choice applied to Media Centre, not this new app. No Windows-only logic in the core. Windows provisioning restricts the ignored private directory to owner/SYSTEM; other OSes use restrictive file modes.

Secrets are AES-GCM encrypted, with unique IV and item-ID additional authenticated data. Names/kinds/email are encrypted too. The server key lives in the ignored local private directory; it is not PIN-derived. That key is readable by same-account processes and loss of the key prevents recovery. PIN verifier: random salt, server HMAC pepper and PBKDF2; PIN approval is not a replacement for email authentication. Session cookies are HttpOnly/SameSite Strict; expiry, revocation, one-use email codes, bounded attempts and conditional database updates gate the final transition. No plaintext secret values in routine logs or public configuration.

CF Email REST uses the existing private Wrangler OAuth authorization at send time, never in browser output. It sends only after the user's own CAPTCHA/send action. Account sending is enabled, but live delivery still requires validation. This broad developer authorization is a local integration convenience, not the proposed least-privilege production credential deployment. Provider errors fail closed. Browser/agent action grants beyond this vault's local UI are not implemented yet.

Turnstile Siteverify requires success, vault_login action and localhost hostname. Real widget registration/secret provisioning is pending the skill-required confirmation; missing configuration fails closed. No dummy CAPTCHA grants access to the real app. Isolated tests inject CAPTCHA/email adapters on separate test instances only.

## Appearance / celebration

Approved base reference copied privately to .design-reference with its definition document; application adapts L0/box and five layered planes to the current dark-luxury VISTAMATIONS direction and responsive controls. Original base files and port3000 untouched.

Original GSAP 3.15.0 timeline combines finite vector diamond/ray/paw particles, per-skin colour/easing, cleanup on completion and explicit reduced-motion/static fallback. Six packs: Enterprise, Medieval, Kittens, Retro, Space, Savanna. No long-running ambient flashes or user-script editor. Preview motion is labelled decorative; successful finish uses the same effect only after access is granted. Sources: https://gsap.com/docs/v3/GSAP/gsap.timeline()/ and https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/ . Motion motif research remains in the Media Centre v2 design; no third-party demo artwork copied.

File/New/Open/Save/Delete/Exit act on local saved secret items and lock; Edit clipboard actions use explicit selected field and browser permission; Secrets/Password opens an item editor; Settings includes Vaultskin/Configuration. Delete is a tombstone, not forensic erasure. Clipboard history is not cleared by this app.

## Boundaries and pending work

No public deployment or remote secret database, no Madeline changes, no reuse of her PINs. Real email ownership confirmation and CAPTCHA remain human/provider checks. The first bootstrap browser session owns initial enrolment; no cross-profile OS identity isolation is claimed. Confirm safe recovery/key backup before storing valuable credentials; the encrypted item DB has no certified backup/restore test yet. D1 config/spec backup excludes the secret store and key by design.
