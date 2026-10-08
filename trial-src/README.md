# Trial V1 staging status

This directory contains **staged examples, not a working APK**.

The production workflow currently extracts `datacore-erp-final.zip`, so the files in `trial-src/` are **not used in the build**. Do not distribute a customer trial APK until the full modified application is committed and validated.

## Critical checks
- `TrialManager.tsx` is a prototype, not ready for production. In particular, its Firebase secondary-app configuration must be validated against the actual web config; expiry creation currently relies on the device clock and needs a trusted server-side timestamp.
- Trial enforcement must use Firestore rules with `request.time`, with emulator tests for unauthorized and expired accounts.
- Verify every ERP query and transaction uses tenant-scoped collections and cannot read owner records.
- Verify the existing owner account and data still work.
- Deploy Firestore rules to the correct existing project only after tests; editing this repository does **not** deploy rules.
- Rebuild the signed release APK and verify it on a physical device.

Customer businesses can use the generic ERP initially, but dedicated restaurant orders, laundry tickets and workshop job cards are separate features.

No payment or billing is required.
