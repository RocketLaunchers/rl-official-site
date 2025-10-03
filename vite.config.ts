import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
// Build static copy targets dynamically only if folders exist
function makeStaticCopyPlugin() {
  const blogsDir = path.resolve(process.cwd(), 'src', 'blogs');
  let targets: any[] = [];
  const hasFiles = (dir: string): boolean => {
    if (!fs.existsSync(dir)) return false;
    const stack: string[] = [dir];
    while (stack.length) {
      const d = stack.pop()!;
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(d, e.name);
        if (e.isFile()) return true;
        if (e.isDirectory()) stack.push(p);
      }
    }
    return false;
  };
  if (fs.existsSync(blogsDir)) {
    const entries = fs.readdirSync(blogsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const assetsDir = path.join(blogsDir, slug, 'assets');
      const videosDir = path.join(blogsDir, slug, 'videos');
      if (hasFiles(assetsDir)) {
        // Copy preserving slug/assets relative structure
        targets.push({
          src: `src/blogs/${slug}/assets/**/*`,
          dest: `blogs/${slug}/assets`
        });
      }
      if (hasFiles(videosDir)) {
        targets.push({
          src: `src/blogs/${slug}/videos/**/*`,
          dest: `blogs/${slug}/videos`
        });
      }
    }
  }
  return targets.length > 0 ? viteStaticCopy({ targets }) : null;
}

function devBlogsMiddleware(): Plugin {
  return {
    name: 'blogs-static-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          const url = req.url || '';
          const m = url.match(/^\/blogs\/([^/]+)\/(assets|videos)\/(.*)$/);
          if (!m) return next();
          const slug = m[1];
          const kind = m[2];
          const rest = m[3];
          const filePath = path.join(process.cwd(), 'src', 'blogs', slug, kind, rest);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        } catch {}
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    devBlogsMiddleware(),
    // Only add static copy plugin if there are assets to copy
    ...(function() { const p = makeStaticCopyPlugin(); return p ? [p] : []; })()
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
