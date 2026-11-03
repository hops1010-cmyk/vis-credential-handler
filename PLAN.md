# Plan

## Objective

Save repeated authentication effort while keeping owner authorization and provider controls. Pete regards even one reliably avoided repeated login as useful; no security-strength percentage is asserted.

## Workflow proposal

1. Pete authorizes a service using its supported connection flow.
2. An authenticated/paired agent session requests a specific action and resource scope.
3. A private PIN input approves a bounded permission session. Do not collect it through chat, model prompts, CLI arguments or routine logs.
4. The vault uses the appropriate private provider credential without returning it to the model. Bind approval to a random expiring capability rather than treating a short PIN as a public sole credential or encryption key.
5. Repeat permitted actions within the grant without repeated login prompts. End at expiry/revocation or when the provider requires interaction. CAPTCHA hands off to Pete.

## Boundaries

Handler Madeline is an organizational assignment, not configured identity isolation. Actual vault storage, encryption, PIN provisioning, runtime agent identity and secret retrieval must be designed and verified. Do not assume existing plaintext profile environments are an encrypted vault. Do not copy any PIN from conversation into this repository.

Git holds code/specifications/config templates; D1 holds versioned non-secret config/spec records and restore references. The Vistamations website and local app share the intended contracts, but no hosting path/port is assigned. Local service authentication and public service authentication must both be designed.

## Exit to Design

Select runtime and private secret-storage integration, owner/agent-session authentication, permission scopes/expiry/revoke behaviour, provider connectors and backup restore contract. Identify exact web/local/D1 targets without replacing other apps. Then produce reviewable interfaces and workflows. No implementation or deployment authorized merely by this entry.

## Validation planned

Test provider authentication, PIN attempts/expiry, session binding, replay, scope boundaries, revocation, token refresh, human sign-in handoff and secret absence from model outputs/repo/logs. Read back config/spec backups and test restoration before reporting verified recovery.
