/**
 * Vite configuration for the VPS Panel concept build.
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * Security headers for the local dev server and `vite preview`.
 * Production static hosting must send the same headers (see public/_headers);
 * `frame-ancestors` and HSTS cannot be expressed by a meta tag.
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'",
};

const securityHeaders = (): Plugin => ({
  name: 'vps-panel-security-headers',
  configureServer(server) {
    server.middlewares.use((_request, response, next) => {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((_request, response, next) => {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value);
      next();
    });
  },
});

export default defineConfig({
  plugins: [tailwindcss(), securityHeaders()],
  server: {
    port: 5175,
    strictPort: true,
  },
  preview: {
    port: 5175,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    css: false,
    restoreMocks: true,
  },
});
