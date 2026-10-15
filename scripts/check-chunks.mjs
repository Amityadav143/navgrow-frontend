/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Build guard: fails the build if the emitted JS chunks import each other in a
 * cycle that involves the React vendor chunk.
 *
 * Why: with manual chunk splitting, a cycle like vendor-react → vendor →
 * vendor-react lets the browser evaluate a library (e.g. Radix UI) before React
 * itself, and the whole site renders blank with
 * "Cannot read properties of undefined (reading 'forwardRef')". Tests don't run
 * the production bundle, so this check runs right after `vite build`.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('dist/assets');
if (!fs.existsSync(dir)) {
  console.error('[check-chunks] dist/assets not found — run vite build first.');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const graph = new Map();
const STATIC_IMPORT = /(?:^|[;\s}])import\s*(?:[^'"()]*?from\s*)?["'](\.\/[^"']+\.js)["']/g;

for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  // Static imports only — dynamic import() is lazy and can't cause load-order cycles.
  const deps = new Set();
  let m;
  while ((m = STATIC_IMPORT.exec(src))) deps.add(path.basename(m[1]));
  graph.set(f, deps);
}

const cycles = [];
const visit = (node, stack, seen) => {
  if (stack.includes(node)) {
    cycles.push([...stack.slice(stack.indexOf(node)), node]);
    return;
  }
  if (seen.has(node)) return;
  seen.add(node);
  for (const d of graph.get(node) || []) visit(d, [...stack, node], seen);
};
for (const f of files) {
  if (f.startsWith('vendor-react')) visit(f, [], new Set());
}

if (cycles.length) {
  console.error('[check-chunks] ✖ Circular chunk imports involving React (the site would load blank):');
  cycles.slice(0, 5).forEach((c) => console.error('   ' + c.join(' → ')));
  console.error('Fix manualChunks in vite.config.js so the react chunk imports nothing else.');
  process.exit(1);
}
const reactChunk = files.find((f) => f.startsWith('vendor-react'));
const reactDeps = reactChunk ? [...(graph.get(reactChunk) || [])] : [];
console.log(`[check-chunks] ✓ ${files.length} chunks, no React chunk cycles` +
  (reactDeps.length ? ` (vendor-react imports: ${reactDeps.join(', ')})` : ''));
