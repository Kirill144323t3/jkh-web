import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Настройка для экспорта статических файлов */
  output: 'export', 
  
  /* Это нужно, чтобы картинки работали в мобильном приложении */
  images: {
    unoptimized: true,
  },

  /* Если у тебя есть другие настройки, оставь их ниже */
};

export default nextConfig;