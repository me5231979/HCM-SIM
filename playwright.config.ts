import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    // Software WebGL so the 3D scene really renders on GPU-less CI runners.
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 180_000 },
});
