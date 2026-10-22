import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        inspector: resolve(__dirname, 'tools/inspector.html')
      }
    }
  },
  server: {
    port: 3000,
    open: false
  }
});
