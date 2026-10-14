import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';

  return {
    plugins: [
      react(),
      isAnalyze &&
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssCodeSplit: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            ui: ['lucide-react', 'clsx', 'tailwind-merge'],
            date: ['date-fns'],
            storage: ['idb'],
          },
        },
      },
    },
    server: {
      port: 5173,
      open: true,
    },
    preview: {
      port: 4173,
    },
  };
});
