import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.chunwoo.ai',
  appName: '천우시스템',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    iosScheme: 'https',
    cleartext: true
  },
  android: {
    backgroundColor: '#181A20',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    initialFocus: false,
    buildOptions: {
      keystorePath: 'my-release-key.keystore',
      keystoreAlias: 'my-key-alias',
      keystorePassword: 'your-keystore-password',
      keystoreAliasPassword: 'your-key-password'
    }
  },
  ios: {
    backgroundColor: '#181A20',
    contentInset: 'automatic',
    scheme: 'com.chunwoo.ai',
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Ionic,
      style: KeyboardStyle.Default,
      resizeOnFullScreen: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#181A20",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#181A20',
      overlaysWebView: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
