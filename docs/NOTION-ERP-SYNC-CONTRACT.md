# DataCore ERP → Notion: Owner-only Manual Summary Contract

**State:** Specification; not implemented or deployed. Date: 2026-10-19.

## Systems and responsibility
- ERP / Firestore: authoritative customer data and all NDT raw readings, formula calculations, audit trails, and final inspector approvals.
- Notion: non-sensitive owner-approved project planning, task status, and engineering documentation.
- Gateway: authenticated backend (Cloudflare Worker pilot may be reused after independent Firebase token verification); never call Notion from the React UI or APK with the internal integration token.

## Proposed integration sources (Notion)
- Private project hub: https://app.notion.com/p/3fe4766ac11d816f91efc44d40275761
- Roadmap DB: https://app.notion.com/p/b8037bec3ccd48e1b379c8cc859e7c5f
- AI knowledge DB: https://app.notion.com/p/be52504c6ae74b6b8bbe6408841eee65
- NDT planning DB: https://app.notion.com/p/3e289fbfd61844c18c9cff6db5e00de9

## Export allowlist (opt-in; not currently enabled)
The proposal is a single-direction MANUAL action with explicit on-device preview and confirmation:
- projectReference: pseudonymous project reference string (max 60 characters).
- workflowStage: recognized status enum, not arbitrary notes.
- taskReference: internal task reference (max 60 characters).
- inspectionMethod: UT/RT/MT/PT/Other or no value.
- updatedAt: server timestamp.
- sourceRecordHash: salted, irreversible, tenant-scoped idempotency key.
- summary: manually verified and redacted owner-written summary (max 200 characters).

**Strict denylist:** customer names, phone numbers, emails, raw TML values, asset coordinates, drawings, inspection images, inspection formulas/results, payroll, invoice amounts, stock counts, payment data, secrets, and credentials.

## Proposed request contract (for later backend implementation)
POST /api/erp/notion/preview:
- Authenticated Firebase ID token in Authorization header.
- Server verifies Firebase token using trusted Google public keys / approved SDK.
- Server checks owner role and assigned tenant (never trusts submitted claims).
- Responds with ONLY fields to be exported; does not call Notion.
- Server-generated nonce/confirmation token expires within minutes.

POST /api/erp/notion/confirm:
- Same authenticated user/tenant.
- Matching preview nonce and dataset hash, strict allowed fields only.
- Server writes to specific approved database, never arbitrary page IDs.
- Idempotency keys prevent duplicate rows.
- Records an audit log; returns sync status without secrets.

No endpoint exists yet; this contract is not authorization to deploy.

## Data isolation rules
- Start with owner account and sample data only; no trial or tenant access.
- Do not allow customer B to read or submit customer A data.
- Never use shared NibrasGPT auth session as proof of ERP/Firebase identity.
- If rolling out tenant connections, use separate OAuth grants and workspace per tenant, explicit data consent and independent storage of refresh/access tokens.
- Test revoked Notion access, token rotation, 401/403/404, timeout, 429 Retry-After and offline behavior.
- Never allow Notion changes to overwrite Firestore NDT records or other operational data.

## Pre-release gates
1. Resolve feature/trial-v1 outstanding blockers; current source is not ready for customer use.
2. Confirm all intended React/Capacitor source code is committed (src in repo currently contains a placeholder), then review real file structure.
3. Firestore Emulator owner, 72-hour active/expired/revoked and tenant isolation checks pass.
4. Backend Firebase ID token verification is implemented and tested.
5. Owner-only manual preview/confirm flows pass Android device testing and Notion sandbox testing.
6. User explicitly approves deployment. Do not modify existing signed APK or production Firebase rules now.
