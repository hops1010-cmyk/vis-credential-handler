# vis-credential-handler

VISTAMATIONS vault application. Pete's later clarification establishes **two vaults**: this new app entry is **Cody's vault**; Madeline's existing vault is https://vistamations.com/vault. This supersedes the earlier assignment of Madeline as handler of this new entry. The vault itself handles credentials; “broker” is a description of that function, not another service or agent.

Current phase: **Build — local implementation**. Eight-step wizard, encrypted local storage, bounded permission/session flow and skin-matched GSAP celebration are implemented and tested with isolated fixtures. The real PIN/owner setup remains private and unconfigured. Real CAPTCHA provisioning awaits confirmation; real email delivery is not yet verified. Production web deployment and live agent API grants are not implemented.

Purpose: reduce repeated agent authentication work through private PIN approval for a limited session and supported, already-authorized service connections. Preserve actual provider authentication, scope, expiry and revocation. Interactive CAPTCHA/sign-in can hand control to Pete and resume afterward.

- [Plan](PLAN.md)
- [Configuration and backup specification](SPEC.md)
- [File, Edit and Settings menu specification](MENU-SPEC.md)
- [Read-only live-vault flow findings and ownership clarification](VAULT-FLOW-FINDINGS.md)
- [Build design, wizard and security boundaries](BUILD-DESIGN.md)
- [Vault base model and Madeline's observed three-step entry pattern](VAULT-BASE-MODEL.md)
- [Planned backend security and credential-use layer](BACKEND-SECURITY-PLAN.md)

## Run locally

Requires Node 24+ (tested 24.20.0). `npm ci`, then `npm run provision` initializes ignored private local storage; `npm start` serves http://localhost:3215/. Provisioning is idempotent and does not set a PIN. Enter it privately in your browser. Do not change Madeline's existing vault or port3000.

Use `npm test` for isolated backend verification. The browser test additionally uses the installed Tower Playwright package; its exact dependency location is recorded in test/browser-check.mjs. Test email/CAPTCHA adapters never send real messages or grant access in the normal app. `.vault`, test output and the private template reference are excluded from Git.

Normal local server launch was rejected by automatic approval review with “blocked by policy”; no background service is claimed running. Isolated test servers start and close within the tests only. No workaround launch attempted.

Requested targets: Git, Vistamations web, localhost and versioned non-secret config/spec backups indexed in D1. Local build port is 3215 (found free); public path/deployment remain unassigned. D1 specs backup targets the verified existing tower8b-backup database with a namespaced table; report read-back verification separately. Protect existing localhost applications, especially port 3000.

Menu notation clarified by Pete: `menu -file --new` means category menu → main branch File → first-level sub-branch New. Direct form: `file -new -open -save -delete -exit`, where file is the category and each single-dash item is a main branch. Listing branches does not execute all actions. Per-app outcomes must be specified before implementation; these notes do not create a runtime command parser.

Pete defined `app -add-new-name` as create an app and its Git repository and name it. This entry implements that creation scope with named specifications; Build and Deploy remain separate pipeline phases. This is independent of the symbolic hidden key in VIS WORLD and does not reuse any personal, vault or profile PIN by inference.
