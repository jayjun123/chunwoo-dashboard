import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chunwoo.ai',
  appName: '현장관리 시스템',
  webDir: 'dist',
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'automatic'
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'default',
      resizeOnFullScreen: true
    }
  }
};

export default config;
