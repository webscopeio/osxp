#!/usr/bin/env node

import * as esbuild from 'esbuild';

await esbuild.build({
  bundle: true,
  entryPoints: ['./src/index.ts'],
  format: 'esm',
  minify: true,
  outfile: './dist/index.js',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
});
