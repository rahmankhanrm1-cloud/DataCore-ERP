package com.datacore.erp;

import android.accounts.Account;
import android.app.Activity;
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
import java.util.Collections;

/** Separate Drive authorization: never changes Firebase's ERP login. */
@CapacitorPlugin(name = "OwnerDrive")
public class OwnerDrivePlugin extends Plugin {
    private PluginCall pendingCall;
    private ActivityResultLauncher<IntentSenderRequest> launcher;

    @Override public void load() {
        launcher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(), result -> {
                if (pendingCall == null) return;
                if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
                    reject("Google authorization cancelled."); return;
                }
                try {
                    resolve(Identity.getAuthorizationClient(getActivity())
                        .getAuthorizationResultFromIntent(result.getData()));
                } catch (Exception e) { reject("Google Drive authorization failed. Try again."); }
            });
    }

    @PluginMethod public void authorize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pendingCall != null) { call.reject("Authorization already in progress."); return; }
            pendingCall = call;
            AuthorizationRequest request = AuthorizationRequest.builder()
                .setAccount(new Account("rahmansarifa86@gmail.com", "com.google"))
                .setRequestedScopes(Collections.singletonList(
                    new Scope("https://www.googleapis.com/auth/drive.file")))
                .setOptOutIncludingGrantedScopes(true).build();
            Identity.getAuthorizationClient(getActivity()).authorize(request)
                .addOnSuccessListener(result -> {
                    if (pendingCall == null) return;
                    if (result.hasResolution()) {
                        if (result.getPendingIntent() == null) { reject("Google consent is unavailable."); return; }
                        launcher.launch(new IntentSenderRequest.Builder(result.getPendingIntent()).build());
                    } else resolve(result);
                })
                .addOnFailureListener(e -> reject(
                    "Cannot connect Drive. Add rahmansarifa86@gmail.com to this phone and check Google Drive API and Android OAuth configuration."));
        });
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
    }
}
