# Vault as a backend security layer

Pete asked whether Cody's vault can serve as a backend security layer. **Yes, as a planned credential-use and authorization service.** This document adds the design direction; it does not claim that the current local vault already protects other apps or agents.

## Intended flow

Authenticated app/agent → named action request → Pete's scoped permission grant → vault performs the permitted provider operation using private credentials → result returns without exposing the provider key.

- Identify the calling app/agent through a verifiable service identity or paired cryptographic session, not a profile name or a shared four-digit PIN alone.
- Keep Pete's PIN as the convenient approval layer within that authenticated context. Bind grants to caller, allowed action, resource, expiry and revocation state.
- Expose a small allowlisted action API, not arbitrary URLs, shell commands, secret IDs or automatic plaintext key retrieval. Scope each provider credential narrowly.
- Record operation metadata and success/failure without PINs, credentials, private note bodies or full request/response payloads. D1 can index grants and operation status; the private contact note does not belong in that shared index.
- Revoke/expire grants, fail closed on missing authorization, and distinguish read/upload from delete/publish/admin rights. Provider authentication, CAPTCHA and account entitlement remain in effect.
- Keep owner/admin sign-in separate from background machine access. Do not require an agent to solve a CAPTCHA or log into the owner interface for every approved API call.

## Current versus missing

Implemented locally: encrypted item storage, PIN/session checks, wizard/image prompts, email/CAPTCHA verification contracts and gated local UI. Tested with isolated data, not a live production identity/credential service.

Not implemented: authenticated machine callers, scoped capability issuance, provider action adapters, complete audit/revoke UI, production cloud key management, availability/recovery validation and public deployment. Existing same-Windows-account processes are not independently authenticated merely by being called different Tower agents. The symbolic VIS WORLD key and decorative skins are not service authorization.

Before protecting a real app: select one narrow use case (for example, read a project index), implement a provider adapter and caller identity, test wrong caller/scope/replay/expiry/revocation, validate cloud/local key management and recovery, then verify the actual deployment. Secret storage alone is not protection automatically applied to every backend. Keep each app's resource-level checks even when it delegates permission decisions to the vault.

Primary references checked:
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Cloudflare Access service credentials: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/

Status: planned extension. Public hostname and the two recently supplied PINs' target remain pending clarification; no values are recorded here. No third-party API operation or new grant was executed by this document.
