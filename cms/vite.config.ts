import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // The CMS shares the site's content schema as the single source of truth.
  // Aliased to the site file for now; becomes a workspace package when the
  // site moves under apps/ (see CMS_PLAN.md).
  resolve: {
    alias: {
      '@portfolio/content-schema': path.resolve(repoRoot, 'src/content/schema.ts'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    // Allow importing the shared schema file from the repo root (outside cms/).
    fs: { allow: [repoRoot] },
  },
  // Tauri expects a fixed build output it can bundle.
  build: {
    target: 'es2021',
    outDir: 'dist',
    emptyOutDir: true,
  },
  clearScreen: false,
});
