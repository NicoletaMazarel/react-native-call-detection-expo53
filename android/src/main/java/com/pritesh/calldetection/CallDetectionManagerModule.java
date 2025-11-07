package com.pritesh.calldetection;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.os.Bundle;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.Map;

public class CallDetectionManagerModule
        extends ReactContextBaseJavaModule
        implements Application.ActivityLifecycleCallbacks,
        CallDetectionPhoneStateListener.PhoneCallStateUpdate {

    private boolean wasAppInOffHook = false;
    private boolean wasAppInRinging = false;
    private ReactApplicationContext reactContext;
    private TelephonyManager telephonyManager;
    private CallDetectionPhoneStateListener callDetectionPhoneStateListener;
    private Activity activity = null;

    public CallDetectionManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "CallDetectionManagerAndroid";
    }

    @ReactMethod
    public void startListener() {
        if (activity == null) {
            activity = getCurrentActivity();
            if (activity != null) {
                activity.getApplication().registerActivityLifecycleCallbacks(this);
            }
        }

        telephonyManager = (TelephonyManager) this.reactContext.getSystemService(
                Context.TELEPHONY_SERVICE
        );

        callDetectionPhoneStateListener = new CallDetectionPhoneStateListener(this);

        telephonyManager.listen(
                callDetectionPhoneStateListener,
                PhoneStateListener.LISTEN_CALL_STATE
        );
    }

    @ReactMethod
    public void stopListener() {
        if (telephonyManager != null && callDetectionPhoneStateListener != null) {
            telephonyManager.listen(callDetectionPhoneStateListener,
                    PhoneStateListener.LISTEN_NONE);
        }
        telephonyManager = null;
        callDetectionPhoneStateListener = null;
    }

    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> map = new HashMap<String, Object>();
        map.put("Incoming", "Incoming");
        map.put("Offhook", "Offhook");
        map.put("Disconnected", "Disconnected");
        map.put("Missed", "Missed");
        return map;
    }

    private void sendEvent(String event, String phoneNumber) {
        String payload = event + "|" + (phoneNumber != null ? phoneNumber : "");
        this.reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("PhoneCallStateUpdate", payload);
    }

    @Override
    public void phoneCallStateUpdated(int state, String phoneNumber) {
        switch (state) {
            case TelephonyManager.CALL_STATE_IDLE:
                if (wasAppInOffHook) {
                    sendEvent("Disconnected", phoneNumber);
                } else if (wasAppInRinging) {
                    sendEvent("Missed", phoneNumber);
                }

                wasAppInRinging = false;
                wasAppInOffHook = false;
                break;

            case TelephonyManager.CALL_STATE_OFFHOOK:
                wasAppInOffHook = true;
                sendEvent("Offhook", phoneNumber);
                break;

            case TelephonyManager.CALL_STATE_RINGING:
                wasAppInRinging = true;
                sendEvent("Incoming", phoneNumber);
                break;
        }
    }

    // Lifecycle stubs (no changes needed)
    @Override public void onActivityCreated(Activity activity, Bundle savedInstanceState) {}
    @Override public void onActivityStarted(Activity activity) {}
    @Override public void onActivityResumed(Activity activity) {}
    @Override public void onActivityPaused(Activity activity) {}
    @Override public void onActivityStopped(Activity activity) {}
    @Override public void onActivitySaveInstanceState(Activity activity, Bundle outState) {}
    @Override public void onActivityDestroyed(Activity activity) {}
}
