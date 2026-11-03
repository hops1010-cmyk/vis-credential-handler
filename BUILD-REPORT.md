# Local v1 build report

Built under Pete's instruction to create Cody's vault and proceed to Build. The two private PINs for Madeline's vault were not entered, submitted, stored or inspected. No accepted real PIN is hardcoded or prefilled in this app. Its private first-run field is for Pete to enter directly.

Implemented: eight-step new Cody wizard; numeric/dot-symbol PIN entry; Dinosaur/Tower/Archetype/System SVGs and ordered image prompt; private email entry; server-side Turnstile verifier; one-time email-code flow; final gated button; six original GSAP celebration presets; File/Edit/Secrets/Settings; encrypted local item storage, bounded attempts, expiring/revocable HttpOnly sessions and strict origin checks.

## Verification completed

- Six backend tests: full sequence/encrypted CRUD/logout; step-skipping and wrong CAPTCHA; PIN verifier/attempt bounds/setup overwrite; origin/expiry; bootstrap session ownership; authenticated ciphertext tampering.
- Chromium and Firefox 157 isolated browser runs: all eight steps, image mode, six skin previews, gated final button, item UI, locking, 390px layout, reduced motion and no page errors.
- Test email/CAPTCHA adapters are explicitly isolated and use generated fixture values. No real email was sent; no real CAPTCHA solved. The initial Firefox harness timing error was fixed and its run passed.
- Dependency audit: 0 findings after upgrading project-local Wrangler to 4.157.0. GSAP pinned at 3.15.0; lockfile committed.
- Ignored private directory ACL checked: current Windows account and SYSTEM only. Keys/SQLite/private refs/test outputs are not staged. This is not separate same-account agent authentication or an independent security audit.
- GitHub main matches the pushed build; follow-up documentation/verification fixes are recorded in Git history.
- D1 non-secret config/spec snapshot verified: tower8b-backup / vis_app_spec_backups, ID vis-credential-handler-1ddfdd6c173e9e3a, SHA256 1ddfdd6c173e9e3af406a46c172d4d9912d43b66f17dc8b9f1c99d52b4463428. This is configuration/specification backup only, not encrypted secret/key backup. No restoration test.
- Protected port3000 base file retains the previously recorded SHA256; source templates/Madeline's vault unchanged by this build.

## Pending / exact blockers

1. Normal hidden local server launch on free port3215 was rejected by automatic approval review with only “blocked by policy.” It was not retried through a workaround; no live listener is claimed. Test listeners are isolated and closed after tests.
2. Real Turnstile creation for localhost/127.0.0.1 and private secret storage awaits the explicit confirmation requested under C:/Users/hops1/.agents/skills/turnstile-spin/SKILL.md. The skill requires domain confirmation and approval before wiring the secret. No widget creation/getter/write has run.
3. Cloudflare reports vistamations.com email sending enabled and local OAuth authorization is available; actual sender delivery and receipt remain unverified. Step8 fails closed without configured CAPTCHA/email. Verification mail is sent only after Pete deliberately submits the corresponding form.
4. No public website deployment, cloud secret store or live agent capability API has been released. Production least-privilege auth/key management and tested encrypted-data recovery remain separate work.

Quality gauge: **88/100 for the local build**, based on functional/negative-path tests and browser results. Not a security-strength score. Integration/recovery evidence remains incomplete.
