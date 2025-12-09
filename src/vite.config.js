import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // CRITICAL for deploying to a subdirectory like 'myname.github.io/wikiexplorer/'
  // This sets the base public path for the final built assets.
  base: '/wikiexplorer/', 
  
  // Ensure that source files (like src/main.js) are resolved correctly
  // even with the subdirectory base path set.
  resolve: {
    alias: {
      '/src': 'src'
    }
  }
});