/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH lets GitHub Pages serve from /pay-period/. Vercel and local dev use "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1600 },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
