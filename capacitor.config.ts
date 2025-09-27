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
    webContentsDebuggingEnabled: false,
    initialFocus: false,
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36',
    appendUserAgent: 'ChunwooApp/1.0.0',
    useLegacyBridge: false
  },
  ios: {
    backgroundColor: '#181A20',
    contentInset: 'automatic',
    scheme: 'com.chunwoo.ai',
    limitsNavigationsToAppBoundDomains: true,
    scrollEnabled: true,
    allowsInlineMediaPlayback: true,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    allowsBackForwardNavigationGestures: false,
    allowsLinkPreview: false,
    isScrollEnabled: true,
    disallowOverscroll: true
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Ionic,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true
    },
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#181A20",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#4CAF50",
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
    },
    SafeArea: {
      enabled: true
    }
  }
};

export default config;
