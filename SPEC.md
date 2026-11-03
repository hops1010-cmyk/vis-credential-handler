# Configuration and backup specification

Status: proposed, not implemented.

Public-safe configuration: app ID/name, schema version, feature flags, connector types, scope names, expiry policy, secret binding names and environment placeholders. Never include live tokens, PINs, recovery answers, private keys, account cookies or signed URLs.

D1 backup record: app ID, revision, config/spec schema version, created time, Git commit, artifact checksum, bounded sanitized payload or artifact reference, verification status and restore-test outcome. Large artifacts remain in approved object storage with indexed references. Exact D1 binding/database is unassigned; no backup executed by this document.

Restore record ties Git commit and schema/migration version to required private provisioning references. A Git commit/config backup does not alone restore private credentials or constitute a tested application restore. Public metadata must not identify private account data unnecessarily.

Application menu actions require specific object scope and results. File → New/Open/Save/Delete/Exit must never be assumed to create/delete live credentials or rotate secrets merely from the familiar menu label. Specify object, authorization, confirmation/recovery and observable outcome in Design.

Implementation phases: Plan → Design → Build → Deploy. This initial app/repo entry contains no executable app, Windows permission changes, service listeners or cloud resources.
