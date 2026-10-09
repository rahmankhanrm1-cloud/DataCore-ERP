# Trial V1 — Deployment safety checklist

STATUS: **NOT READY FOR CUSTOMERS**. Existing APK and main branch must remain unchanged.

## Current progress
- Draft Firestore rules in this branch scope owner data to legacy root collections.
- Trial accounts use `trialAccounts/{uid}` and tenant data `tenants/{uid}/{collection}/{document}`.
- Rules check `request.time` against the trial expiry; the APK clock alone must never enforce access.

## Blockers
1. Commit the reviewed trial source files from the local prototype to this branch. The original `datacore-erp-final.zip` in main is still the OLD ERP and the existing workflow extracts that ZIP.
2. Run TypeScript/build tests and Firestore rules emulator tests, including owner, active trial, expired trial, revoked trial, cross-tenant access, unauthenticated users.
3. Ensure account provisioning uses trusted server timestamps and Firebase email verification or admin approval. Do not grant arbitrary users write access to trialAccounts.
4. Verify legacy owner data remains accessible and trial customer cannot read it.
5. Deploy approved rules to the existing Firebase project only after emulator tests and a backup.
6. Build a signed APK with the existing GitHub Actions signing secrets, using artifact name `DataCore-ERP-Trial-V1`; verify installed APK and trial expiry before distribution.
7. Customer-specific workshop/restaurant/laundry workflows are not implemented yet; these need separate features.

Do not merge this branch or deploy draft rules as-is. No billing or payment features are requested.
