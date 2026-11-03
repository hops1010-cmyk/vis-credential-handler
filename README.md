# vis-credential-handler

VISTAMATIONS vault application. Pete's later clarification establishes **two vaults**: this new app entry is **Cody's vault**; Madeline's existing vault is https://vistamations.com/vault. This supersedes the earlier assignment of Madeline as handler of this new entry. The vault itself handles credentials; “broker” is a description of that function, not another service or agent.

Current phase: **Entry / Plan**. This repository contains specifications and a plan, not a functioning vault. No credentials, PINs, service connections or access policies are provisioned here.

Purpose: reduce repeated agent authentication work through private PIN approval for a limited session and supported, already-authorized service connections. Preserve actual provider authentication, scope, expiry and revocation. Interactive CAPTCHA/sign-in can hand control to Pete and resume afterward.

- [Plan](PLAN.md)
- [Configuration and backup specification](SPEC.md)
- [File, Edit and Settings menu specification](MENU-SPEC.md)
- [Read-only live-vault flow findings and ownership clarification](VAULT-FLOW-FINDINGS.md)

Requested targets: Git, Vistamations web, localhost and versioned non-secret config/spec backups indexed in D1. Exact web path, local port and D1 database remain to verify. No deployment/backup is claimed. Protect existing localhost applications, especially port 3000.

Menu notation clarified by Pete: `menu -file --new` means category menu → main branch File → first-level sub-branch New. Direct form: `file -new -open -save -delete -exit`, where file is the category and each single-dash item is a main branch. Listing branches does not execute all actions. Per-app outcomes must be specified before implementation; these notes do not create a runtime command parser.

Pete defined `app -add-new-name` as create an app and its Git repository and name it. This entry implements that creation scope with named specifications; Build and Deploy remain separate pipeline phases. This is independent of the symbolic hidden key in VIS WORLD and does not reuse any personal, vault or profile PIN by inference.
