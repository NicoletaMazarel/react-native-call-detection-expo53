import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
} from "react-native";

export const permissionDenied = "PERMISSION DENIED";

const NativeCallDetectorAndroid = NativeModules.CallDetectionManagerAndroid;
const NativeCallDetectorIOS = NativeModules.CallDetectionManager;

const eventEmitter = new NativeEventEmitter(
  Platform.OS === "ios" ? NativeCallDetectorIOS : NativeCallDetectorAndroid
);

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
      this.subscription = eventEmitter.addListener(
        "PhoneCallStateUpdate",
        callback
      );
    } else {
      (async () => {
        if (readPhoneNumberAndroid) {
          const ok = await requestPermissionsAndroid(permissionMessage);
          if (!ok) permissionDeniedCallback(permissionDenied);
        }
        NativeCallDetectorAndroid?.startListener();

        this.subscription = eventEmitter.addListener(
          "PhoneCallStateUpdate",
          (payload) => {
            if (typeof payload === "string") {
              // Format: "Incoming|+123456789"
              const [event, phoneNumber] = payload.split("|");
              callback(event, phoneNumber || null);
            } else {
              // Fallback pentru compatibilitate
              callback(payload, null);
            }
          }
        );
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
