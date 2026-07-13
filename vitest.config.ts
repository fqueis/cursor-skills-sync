import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');

export default defineConfig({
  resolve: {
    alias: {
      '@commands': path.join(src, 'commands'),
      '@config': path.join(src, 'config'),
      '@fs': path.join(src, 'fs'),
      '@github': path.join(src, 'github'),
      '@sync': path.join(src, 'sync'),
      '@ui': path.join(src, 'ui'),
      '@constants': path.join(src, 'constants.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
