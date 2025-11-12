import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
} from "react-native";

export const permissionDenied = "PERMISSION DENIED";

const NativeCallDetectorAndroid = NativeModules.CallDetectionManagerAndroid;
const NativeCallDetectorIOS = NativeModules.CallDetectionManager;

// Create event emitter only if native module exists and has the required methods
const createEventEmitter = () => {
  const nativeModule =
    Platform.OS === "ios" ? NativeCallDetectorIOS : NativeCallDetectorAndroid;

  if (!nativeModule) {
    console.warn("CallDetection native module not found");
    return null;
  }

  // Check if native module has the required methods for NativeEventEmitter
  if (nativeModule.addListener && nativeModule.removeListeners) {
    return new NativeEventEmitter(nativeModule);
  } else {
    console.warn(
      "CallDetection native module does not support NativeEventEmitter interface"
    );
    // Fallback: create event emitter with the module anyway (may still work)
    return new NativeEventEmitter(nativeModule);
  }
};

const eventEmitter = createEventEmitter();

// Request permission on Android 9+
const requestPermissionsAndroid = async (permissionMessage) => {
  const requiredPermission =
    Platform.constants.Release >= 9
      ? PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
      : PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE;

  const granted = await PermissionsAndroid.check(requiredPermission);
  if (granted) return true;

  const result = await PermissionsAndroid.request(
    requiredPermission,
    permissionMessage
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

class CallDetectorManager {
  subscription;
  callback;

  constructor(
    callback,
    readPhoneNumberAndroid = false,
    permissionDeniedCallback = () => {},
    permissionMessage = {
      title: "Phone State Permission",
      message:
        "This app needs access to your phone state in order to react and/or adapt to incoming calls.",
    }
  ) {
    this.callback = callback;

    if (Platform.OS === "ios") {
      NativeCallDetectorIOS?.startListener();
      if (eventEmitter) {
        this.subscription = eventEmitter.addListener(
          "PhoneCallStateUpdate",
          callback
        );
      }
    } else {
      (async () => {
        if (readPhoneNumberAndroid) {
          const ok = await requestPermissionsAndroid(permissionMessage);
          if (!ok) permissionDeniedCallback(permissionDenied);
        }
        NativeCallDetectorAndroid?.startListener();

        if (eventEmitter) {
          // Parse event payload correctly
          this.subscription = eventEmitter.addListener(
            "PhoneCallStateUpdate",
            (payload) => {
              console.log("CallDetector payload:", payload);

              if (typeof payload === "string") {
                const [event, phoneNumber] = payload.split("|");
                callback(event, phoneNumber || null);
              } else {
                callback(payload, null);
              }
            }
          );
        } else {
          console.warn("CallDetection event emitter not available");
        }
      })();
    }
  }

  dispose() {
    NativeCallDetectorIOS?.stopListener();
    NativeCallDetectorAndroid?.stopListener();

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = undefined;
    }
  }
}

export default CallDetectorManager;
