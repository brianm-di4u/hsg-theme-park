// Rebuilds vendor/three.min.js, a classic-script (IIFE) bundle that sets window.THREE, so the game can
// load three.js with a plain <script src> after first paint (works from file://, where ES-module imports fail).
//
//   cd tools/dev && npm install   (once: three@0.186.1 and esbuild, build-time only)
//   node tools/build-vendor.mjs
//
// Source: npm `three@0.186.1` (MIT, LICENSE copied to vendor/three-LICENSE). Recorded in SAMPLES.md.
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const nm = path.join(here, 'dev', 'node_modules');
const require = createRequire(path.join(nm, 'x.js'));
const esbuild = require('esbuild');
const out = path.join(here, '..', 'vendor', 'three.min.js');
fs.mkdirSync(path.dirname(out), { recursive: true });
await esbuild.build({
  entryPoints: [path.join(here, 'three-entry.js')], bundle: true, minify: true, format: 'iife', globalName: 'THREE',
  nodePaths: [nm], outfile: out, target: 'es2020', legalComments: 'none',
  banner: { js: '/* three.js r186.1 (npm three@0.186.1), MIT License, Copyright 2010-2026 three.js authors. See three-LICENSE. */' },
});
fs.copyFileSync(path.join(nm, 'three', 'LICENSE'), path.join(here, '..', 'vendor', 'three-LICENSE'));
console.log(out, (fs.statSync(out).size / 1024).toFixed(1), 'KB');
