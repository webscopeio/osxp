#!/usr/bin/env node

import * as esbuild from 'esbuild';

let ctx = await esbuild.context({
  bundle: true,
  entryPoints: ['./src/index.ts'],
  format: 'esm',
  minify: true,
  outfile: './dist/index.js',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
});

await ctx.watch();
