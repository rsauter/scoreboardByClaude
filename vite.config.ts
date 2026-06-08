import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  root: 'src/client',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3000',
      '^/socket': {
        target: 'ws://localhost:3000',
        ws: true,
      }
    }
  },
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        gamestart: resolve(__dirname, 'src/client/gamestart.html'),
        operator:  resolve(__dirname, 'src/client/operator.html'),
        manager:   resolve(__dirname, 'src/client/manager.html'),
        display:   resolve(__dirname, 'src/client/display.html'),
      }
    }
  }
});