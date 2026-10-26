/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH lets GitHub Pages serve from the repo path (/HCM-SIM/). Local dev uses "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1600 },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
