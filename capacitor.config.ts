import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.jkh',
  appName: 'ЖКХ Контроль',
  webDir: 'out',
  server: {
    url: 'https://jkh-web.vercel.app/', // <--- ВОТ СЮДА ССЫЛКУ НА VERCEL
    cleartext: true
  }
};

export default config;