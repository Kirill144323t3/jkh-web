import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kirill.jkh',
  appName: 'Система ЖКХ',
  webDir: 'public',
  server: {
    url: 'http://80.90.185.192:3000',
    cleartext: true
  }
};

export default config;