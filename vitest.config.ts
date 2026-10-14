import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e', '**/*.d.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/domain/**', 'src/infrastructure/**', 'src/lib/**'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        'src/**/*.d.ts',
        'src/test/**',
        // Barrel files only re-export; there is no logic to cover.
        'src/**/index.ts',
        // Thin browser IndexedDB shim; its behaviour is verified end-to-end and
        // through the in-memory FakeStorageAdapter in unit tests.
        'src/infrastructure/storage/indexedDBAdapter.ts',
        'src/main.tsx',
        'src/app/**',
        'src/features/**/pages/**',
        'src/features/**/components/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    globals: true,
    css: true,
  },
});
