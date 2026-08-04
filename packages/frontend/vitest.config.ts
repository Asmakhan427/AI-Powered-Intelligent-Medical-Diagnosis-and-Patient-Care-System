/// <reference types="vitest/config" />
// NOTE: this stands in for the requested `jest.config.js`. The project asked
// for Jest, but this codebase already has vitest installed and wired into
// package.json's scripts (nothing built on it yet), and Jest doesn't
// natively understand `import.meta.env` — used throughout src/config/env.ts
// — without extra transform shims. Vitest is a near-drop-in Jest-API
// replacement (same describe/it/expect/@testing-library/jest-dom usage,
// `globals: true` below removes the need to import them) that reuses this
// project's real Vite config, so it needs none of that. See the
// conversation for the explicit confirmation to go this route.
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary', 'lcov'],
        // Same intent as the backend's jest.config.js: the target the
        // suite should grow into, not a number tuned to already pass with
        // only the handful of test files that exist today.
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        exclude: [
          'node_modules/',
          'src/__tests__/',
          'src/**/*.d.ts',
          'src/main.tsx',
          'src/vite-env.d.ts',
        ],
      },
    },
  })
);
