import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Разрешить доступ через ngrok
    allowedHosts: [
      'localhost',
      '5d9b-195-133-66-246.ngrok-free.app',
      // Общая конфигурация для любых доменов ngrok
      '.ngrok-free.app',
      '.ngrok.io'
    ],
  },
});
