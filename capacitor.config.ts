import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chunwoo.construction',
  appName: '건설현장관리시스템',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    buildOptions: {
      keystorePath: 'my-release-key.keystore',
      keystoreAlias: 'my-key-alias',
      keystorePassword: 'your-keystore-password',
      keystoreAliasPassword: 'your-key-password'
    }
  },
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'automatic',
    scheme: 'com.chunwoo.construction',
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'default',
      resizeOnFullScreen: true
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
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
      backgroundColor: '#ffffff'
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
