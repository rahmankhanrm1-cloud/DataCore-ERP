# Owner private storage

Owner ERP account: datacore.solutionswork@gmail.com
Storage Google account: rahmansarifa86@gmail.com

This module uses the owner's existing Google Drive quota. It does not create a new free 1 TB server or guarantee a particular amount of remaining space. Google account storage usage and limit are read from Drive on connection.

## Behavior

- Owner-only menu, with verified owner login required by the storage screen.
- Android Google authorization is separate from Firebase ERP authentication. No sign-in credential is applied to Firebase during Drive connection.
- Only `drive.file` authorization is requested, scoped to files this application creates or the user explicitly authorizes.
- Google checks the OAuth token on every Drive request. Credentials and private files are never supplied to customer accounts through ERP, Firestore or the APK.
- The Google Drive `about.user.emailAddress` response validates the expected storage account before a root folder is read or created.
- The root is created in My Drive without sharing permissions. This feature does not create public links or grant permissions.
- Folder browsing, local folder search, paginated listing, multiple sequential file uploads, chunked resumable transfer, and moving files to Drive Trash.
- File opening and downloading uses the authenticated Google Drive app/browser, rather than buffering large downloads in the WebView.
- Access tokens stay only in memory, are discarded on logout, disconnect, screen exit or expiry, and never enter localStorage, Firebase, logs or the repository.
- No background backup. Uploads require the screen to stay open. Interrupted uploads must currently be retried; the upload session is not persisted across restart.
- Desktop/web Drive connection is not implemented; the screen explicitly directs the owner to the Android app.

## Google setup required before live use

1. Enable Google Drive API in the existing Google Cloud project used by the Android OAuth client.
2. Verify Android OAuth package `com.datacore.erp` and the existing release signing SHA-1. This feature uses Android AuthorizationClient and does not require a client secret in the APK.
3. Configure the OAuth consent screen for the non-sensitive `https://www.googleapis.com/auth/drive.file` scope. If the consent screen is in testing, add the storage account as a test user.
4. Add rahmansarifa86@gmail.com to the owner's Android device, sign into ERP as the verified owner (Google sign-in), open My Private Storage, tap Connect My Google Drive, select the storage account in Google's account picker, and approve consent. A wrong account is rejected before requesting Drive access. ERP authentication is never changed.
5. Confirm the account email and available quota; test upload, folder creation, download, trash/recovery in Drive, reconnect, and logout. Check that customer accounts have no storage menu and cannot obtain the owner's token.

Repository changes do not enable APIs or alter OAuth settings. No Drive files have been accessed, uploaded or shared by developing this feature. Do not claim end-to-end verification until the owner's consent and physical-device testing succeed.

If Google consent closes without showing a page, the Android callback reads any returned Google error Intent and displays the status code instead of assuming the owner pressed Cancel. Empty responses remain inconclusive and explicitly point to OAuth/Google Play services checks. The build prints only the public signing certificate SHA-1/SHA-256 for comparison with the Android OAuth client; it does not print signing passwords or key material.
