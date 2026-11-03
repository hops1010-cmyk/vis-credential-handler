# Vault flow — read-only findings

Checked 2026-11-04 Sydney, following Pete's request to find the logic without learning the two private PINs. No PIN submitted, keypad pressed, authentication attempted or private credential store inspected. Only public UI and client control flow were inspected; all quoted literals and numbers were removed before printing source-derived control flow.

## Current ownership clarification

Pete explicitly distinguished two vaults: Madeline's deployed https://vistamations.com/vault and Cody's new vis-credential-handler app entry. Three PIN roles are discussed: two private ones for Madeline's vault and one assigned agent PIN. No values are recorded here. Prior statements assigning the new repository to Madeline describe the earlier naming discussion; this later clarification takes precedence.

## Observed live implementation

Public /vault title: Vis Vault. Initial instruction asks for the secondary PIN. Keypad has digits, Clear and Enter; entered characters are masked. Client sends a step and PIN to a server endpoint and waits for an ok result. Accepted first stage resets input and asks for the vault PIN. Accepted next stage signals Vault unlocked, triggers fireworks and schedules navigation. Rejection displays Denied and clears input. Backend verification, secret storage and server-side session enforcement were not inspected or tested.

This is a two-stage PIN gate. It does not expose numbered setup-wizard steps 1–4 to an unauthenticated browser. The local docker37-vis-vault/index.html is a small placeholder with no scripts; its GitHub repository has README.md and index.html on master. That local entry is not sufficient evidence for the live gate's backend source or a four-step wizard. The main/master lookup mismatch was resolved by reading repository metadata; no branch changed.

## Intended flow from Pete's discussion

- Three visual symbols: dinosaur, South Australia, then mesh that turns green when username is approved.
- Email sequence: secondary email entry prompts for primary email. Addresses/credential fragments are intentionally omitted here.
- Pin recycling/private entry is intended to leave the two private PINs with Pete/Madeline while Cody knows only the separately assigned agent PIN.

These discussion requirements do not prove that the current deployed page implements those symbols or numbered wizard steps. Do not equate the live PIN gate, the three visual symbols and the account-identification flow as a verified one-to-one sequence.

## Exact remaining gap

Step 4's heading/action and the three prior numbered setup steps are not recoverable from the observed unauthenticated page, the placeholder repository or the checked profile plan directories. A source location for Madeline's actual wizard or a non-secret view of its labels is needed to identify them without going through Pete's private PIN steps. No step was marked complete; no secure isolation/encryption or successful PIN rotation was verified.
