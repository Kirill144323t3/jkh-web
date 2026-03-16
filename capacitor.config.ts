import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jkh.app',
  appName: 'ЖКХ Система',
  webDir: 'public', // Для Next.js обычно используется 'public' или 'out'
  server: {
    // ТЕПЕРЬ ТУТ ТВОЙ САЙТ В ИНТЕРНЕТЕ
    url: 'https://jkh-web.vercel.app',
    cleartext: true
  }
};

export default config;