declare module "react-native-call-detection" {
  export type Event = "Disconnected" | "Incoming" | "Offhook" | "Missed";

  export type CallDetectorManagerCallback = (
    event: Event,
    phoneNumber: string | null
  ) => void;

  export interface PermissionMessage {
    title: string;
    message: string;
  }

  export type PermissionDeniedCallback = (reason?: string) => void;

  declare class CallDetectorManager {
    constructor(
      callback: CallDetectorManagerCallback,
      readPhoneNumberAndroid?: boolean,
      permissionDeniedCallback?: PermissionDeniedCallback,
      permissionMessage?: PermissionMessage
    );

    dispose(): void;
  }

  export default CallDetectorManager;
}
