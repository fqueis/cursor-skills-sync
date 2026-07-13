import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, 'src');
const watch = process.argv.includes('--watch');

/** Maps `@scope/...` aliases to `src/scope/...` (mirrors tsconfig paths). */
const ALIAS_ROOTS = {
  '@commands': 'commands',
  '@config': 'config',
  '@fs': 'fs',
  '@github': 'github',
  '@sync': 'sync',
  '@ui': 'ui',
};

/**
 * Resolves a candidate file path with optional `.ts` / `index.ts` suffixes.
 */
function resolveFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    path.join(basePath, 'index.ts'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }

  return `${basePath}.ts`;
}

/** Resolves TypeScript path aliases for the bundle. */
const pathAliasPlugin = {
  name: 'path-alias',
  setup(build) {
    build.onResolve({ filter: /^@constants$/ }, () => ({
      path: path.join(srcRoot, 'constants.ts'),
    }));

    build.onResolve({ filter: /^@(commands|config|fs|github|sync|ui)(\/|$)/ }, (args) => {
      const match = args.path.match(/^(@[a-z]+)(?:\/(.*))?$/);
      if (!match) {
        return undefined;
      }

      const [, alias, rest = ''] = match;
      const folder = ALIAS_ROOTS[alias];
      if (!folder) {
        return undefined;
      }

      const basePath = rest
        ? path.join(srcRoot, folder, rest)
        : path.join(srcRoot, folder);

      return { path: resolveFile(basePath) };
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
  plugins: [pathAliasPlugin],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(options);
}
