import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/SynthBlockly/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // ...
      }
    }
  }
})
