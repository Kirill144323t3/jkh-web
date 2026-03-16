import { CapacitorConfig } from '@capacitor/cli'; // ДОБАВЬ ЭТУ СТРОКУ

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'jkh-web',
  webDir: 'out', // Next.js при экспорте создает именно 'out'
  server: {
    url: 'http://45.95.234.160:3000',
    cleartext: true
  }
};

export default config;