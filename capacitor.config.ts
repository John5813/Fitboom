import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.fitboom.app',
  appName: 'FitBoom',
  webDir: 'dist/public',
  server: {
    url: 'https://fitboom.replit.app',
    cleartext: false,
    allowNavigation: [
      '*.tile.openstreetmap.org',
      '*.openstreetmap.org',
      't.me',
      '*.telegram.org',
    ],
  },
  plugins: {
    Geolocation: {
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
