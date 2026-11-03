# vis-credential-handler

VISTAMATIONS vault application. Pete's later clarification establishes **two vaults**: this new app entry is **Cody's vault**; Madeline's existing vault is https://vistamations.com/vault. This supersedes the earlier assignment of Madeline as handler of this new entry. The vault itself handles credentials; “broker” is a description of that function, not another service or agent.

Current phase: **Deployed connection, activation pending**. Local and public endpoints are connected through one tunnel and a reverse proxy. Eight-step wizard, encrypted local storage, Green Zone, PIN exit, dashboard notes and skin-matched GSAP celebrations are implemented. Real PIN/owner setup remains private/unconfigured, CAPTCHA provisioning awaits confirmation and real email delivery is unverified; public access stays locked until successful local completion. Chat UI exists but no live model is configured. Agent capability API remains planned.

Purpose: reduce repeated agent authentication work through private PIN approval for a limited session and supported, already-authorized service connections. Preserve actual provider authentication, scope, expiry and revocation. Interactive CAPTCHA/sign-in can hand control to Pete and resume afterward.

- [Plan](PLAN.md)
- [Configuration and backup specification](SPEC.md)
- [File, Edit and Settings menu specification](MENU-SPEC.md)
- [Read-only live-vault flow findings and ownership clarification](VAULT-FLOW-FINDINGS.md)
- [Build design, wizard and security boundaries](BUILD-DESIGN.md)
- [Vault base model and Madeline's observed three-step entry pattern](VAULT-BASE-MODEL.md)
- [Planned backend security and credential-use layer](BACKEND-SECURITY-PLAN.md)
- [Current two-endpoint deployment, checks and pending activation](DEPLOYMENT.md)

## Run locally

Requires Node 24+ (tested 24.20.0). `npm ci`, then `npm run provision` initializes ignored private local storage; `npm start` serves http://localhost:3215/. Provisioning is idempotent and does not set a PIN. Enter it privately in your browser. Do not change Madeline's existing vault or port3000.

Use `npm test` for isolated backend verification. The browser test additionally uses the installed Tower Playwright package; its exact dependency location is recorded in test/browser-check.mjs. Test email/CAPTCHA adapters never send real messages or grant access in the normal app. `.vault`, test output and the private template reference are excluded from Git.

An earlier hidden background launch was rejected. The later explicitly requested connection is now running in a managed foreground supervisor (`node scripts/run-bridge.mjs`) for the local server and its one tunnel. No hidden startup service/reboot persistence was installed. See DEPLOYMENT.md.

Endpoints: http://localhost:3215/ and https://www.vistamations.com/cody-vault . Public route is live and locked pending local verification. D1 specs backups target tower8b-backup with a namespaced table and verified read-back; actual credentials/private notes are excluded. Other localhost services, especially port3000, remain protected.

Menu notation clarified by Pete: `menu -file --new` means category menu → main branch File → first-level sub-branch New. Direct form: `file -new -open -save -delete -exit`, where file is the category and each single-dash item is a main branch. Listing branches does not execute all actions. Per-app outcomes must be specified before implementation; these notes do not create a runtime command parser.

Pete defined `app -add-new-name` as create an app and its Git repository and name it. This entry implements that creation scope with named specifications; Build and Deploy remain separate pipeline phases. This is independent of the symbolic hidden key in VIS WORLD and does not reuse any personal, vault or profile PIN by inference.
