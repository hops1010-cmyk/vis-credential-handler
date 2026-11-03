# Vault base model

Pete requested Madeline's three steps as the vault base model. Record the observed live entry pattern separately from Cody's newly built eight-step wizard; do not invent Madeline's unknown setup-wizard steps or change her deployed vault by inference.

## Reference entry pattern — Madeline's observed gate

| Step | Name | Observed result |
| --- | --- | --- |
| M1 | Secondary PIN Gate | Accepted entry advances to the next PIN prompt; rejected entry clears. |
| M2 | Vault PIN Gate | Accepted entry allows the client to enter its unlocked state. |
| M3 | Unlock and Celebration | Client displays unlock feedback, runs fireworks and navigates. Backend session/encryption guarantees remain unverified. |

This is the public client control-flow reference from VAULT-FLOW-FINDINGS.md, not proof of Madeline's first three numbered setup steps. No private PINs have been submitted to that page.

## Shared model

- VISTAMATIONS brand and the approved layered shell, with a distinct vault identity/owner and skin.
- Named PIN gates whose verifiers are configured privately, not literal accepted values in source, images, comments or public configuration.
- Explicit pass/fail from the relevant backend, rate limits and clear input handling. Decorative masks/skin changes do not establish access control.
- Unlock/celebration happens after successful checks. Skin motion can be previewed only with an explicit non-authenticating preview label.
- Separate per-vault storage/session/key namespace. Copying the model does not copy another vault's credentials or grant identity.

## Cody's current wizard remains distinct

1. Welcome — Cody's Vault.
2. Privacy Boundary.
3. Vaultskin Selection.
4. Private PIN Setup.
5. Pete's Permission Gate — verify the assigned agent PIN.
6. Four Symbols — Dinosaur, Tower, Archetype, System.
7. Email Identity.
8. Human Check — CAPTCHA and email-code verification.

Final gate: **Enter Cody's Vault**, backed by the server's completed session state. The reference M1–M3 sequence is not silently prepended as three new live authentication steps or substituted for this flow. Exact base-model integration must name the target and preserve Pete's step numbering.

Pete supplied two PIN inputs after requesting this model. Values are intentionally not written here. Their target (Cody model versus Madeline's existing entry gate) is awaiting clarification. No PIN configuration or live login was performed from that ambiguous instruction.
