package com.datacore.erp;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.AccountPicker;
import java.util.Collections;

/** Separate Drive authorization: never changes Firebase's ERP login. */
@CapacitorPlugin(name = "OwnerDrive")
public class OwnerDrivePlugin extends Plugin {
    private PluginCall pendingCall;
    private ActivityResultLauncher<IntentSenderRequest> launcher;
    private ActivityResultLauncher<Intent> accountLauncher;
    private static final String STORAGE_EMAIL = "rahmansarifa86@gmail.com";

    @Override public void load() {
        launcher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(), result -> {
                if (pendingCall == null) return;
                // Google can return an error Intent even with RESULT_CANCELED.
                // Read it before deciding that the user dismissed consent.
                if (result.getData() == null) {
                    reject("Google did not complete Drive consent. If no Google page appeared, check the Android OAuth client and Google Play services. ERP remains signed in."); return;
                }
                try {
                    resolve(Identity.getAuthorizationClient(getActivity())
                        .getAuthorizationResultFromIntent(result.getData()));
                } catch (Exception e) { rejectAuthorization(e); }
            });
        accountLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (pendingCall == null) return;
                if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
                    reject("Storage account selection was not completed. Connect again and select " + STORAGE_EMAIL + "."); return;
                }
                String email = result.getData().getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
                String type = result.getData().getStringExtra(AccountManager.KEY_ACCOUNT_TYPE);
                if (email == null || !STORAGE_EMAIL.equalsIgnoreCase(email) || !"com.google".equals(type)) {
                    reject("Select " + STORAGE_EMAIL + " for storage. Your ERP account stays unchanged."); return;
                }
                requestDriveConsent(new Account(email, type));
            });
    }

    @PluginMethod public void authorize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pendingCall != null) { call.reject("Authorization already in progress."); return; }
            pendingCall = call;
            // A typed email is not proof that the account is available to this app.
            // Let the owner select it through Google's account picker first.
            try {
                AccountPicker.AccountChooserOptions options = new AccountPicker.AccountChooserOptions.Builder()
                    .setAllowableAccountsTypes(Collections.singletonList("com.google"))
                    .setSelectedAccount(new Account(STORAGE_EMAIL, "com.google"))
                    .setAlwaysShowAccountPicker(true)
                    .setTitleOverrideText("Select your private storage account")
                    .build();
                accountLauncher.launch(AccountPicker.newChooseAccountIntent(options));
            } catch (Exception e) {
                reject("Google account picker could not open. Check that Google Play services is enabled and updated.");
            }
        });
    }

    private void requestDriveConsent(Account account) {
        try {
            AuthorizationRequest request = AuthorizationRequest.builder()
                .setAccount(account)
                .setRequestedScopes(Collections.singletonList(
                    new Scope("https://www.googleapis.com/auth/drive.file")))
                .setOptOutIncludingGrantedScopes(true).build();
            Identity.getAuthorizationClient(getActivity()).authorize(request)
                .addOnSuccessListener(result -> {
                    if (pendingCall == null) return;
                    if (result.hasResolution()) {
                        if (result.getPendingIntent() == null) { reject("Google consent is unavailable."); return; }
                        try { launcher.launch(new IntentSenderRequest.Builder(result.getPendingIntent()).build()); }
                        catch (Exception e) { rejectAuthorization(e); }
                    } else resolve(result);
                })
                .addOnFailureListener(this::rejectAuthorization);
        } catch (Exception e) { rejectAuthorization(e); }
    }

    private void rejectAuthorization(Exception e) {
        if (e instanceof ApiException) {
            int code = ((ApiException)e).getStatusCode();
            String next;
            if (code == 10) next = "Android OAuth setup needs attention. Check package com.datacore.erp and this APK's release signing SHA-1 in Google Cloud.";
            else if (code == 7) next = "Check the internet connection and try again.";
            else if (code == 16) next = "Google consent was not completed. If it closed immediately, check OAuth setup and Google Play services.";
            else next = "Check the Google OAuth consent screen, test-user access and Android OAuth client.";
            reject("Google Drive authorization failed (code " + code + "). " + next);
        } else {
            reject("Google Drive consent could not complete. Check Google Play services and Google Cloud OAuth configuration.");
        }
    }

    private void resolve(AuthorizationResult result) {
        if (pendingCall == null) return;
        String token = result.getAccessToken();
        if (token == null || token.isEmpty()) { reject("Google did not grant Drive access."); return; }
        JSObject data = new JSObject(); data.put("accessToken", token);
        PluginCall call = pendingCall; pendingCall = null; call.resolve(data);
    }
    private void reject(String message) {
        if (pendingCall == null) return;
        PluginCall call = pendingCall; pendingCall = null; call.reject(message);
    }
    @Override protected void handleOnDestroy() {
        reject("Storage screen closed.");
        if (launcher != null) launcher.unregister();
        if (accountLauncher != null) accountLauncher.unregister();
    }
}
