const fs = require('fs'), path = require('path');
const parser = require('@babel/parser');
const SRC = path.resolve('src');
const files = [];
(function walk(d){ for (const f of fs.readdirSync(d)) { const p = path.join(d,f);
  if (fs.statSync(p).isDirectory()) { if (f!=='node_modules') walk(p); }
  else if (/\.(jsx?|js)$/.test(f)) files.push(p); } })(SRC);

const resolve = (from, spec) => {
  let base = spec.startsWith('@/') ? path.join(SRC, spec.slice(2))
           : spec.startsWith('.')  ? path.resolve(path.dirname(from), spec)
           : null;                                   // node package — skip
  if (!base) return 'pkg';
  for (const c of [base, base+'.js', base+'.jsx', path.join(base,'index.js'), path.join(base,'index.jsx')])
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
};

const exportsOf = (file) => {
  const src = fs.readFileSync(file,'utf8');
  const names = new Set();
  if (/export\s+default/.test(src)) names.add('default');
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g))
    m[1].split(',').forEach(x => { const n = x.trim().split(/\s+as\s+/).pop().trim(); if (n) names.add(n); });
  return names;
};

const problems = [];
for (const f of files) {
  const ast = parser.parse(fs.readFileSync(f,'utf8'), { sourceType:'unambiguous', plugins:['jsx'] });
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const spec = node.source.value;
    const target = resolve(f, spec);
    const rel = f.replace(SRC+'/','src/');
    if (target === null) { problems.push(`${rel}:${node.loc.start.line}  UNRESOLVED path '${spec}'`); continue; }
    if (target === 'pkg') continue;
    const ex = exportsOf(target);
    for (const s of node.specifiers) {
      if (s.type === 'ImportSpecifier' && !ex.has(s.imported.name))
        problems.push(`${rel}:${node.loc.start.line}  '${s.imported.name}' is NOT exported by '${spec}'`);
      if (s.type === 'ImportDefaultSpecifier' && !ex.has('default'))
        problems.push(`${rel}:${node.loc.start.line}  no default export in '${spec}'`);
    }
  }
}
console.log(`Checked imports across ${files.length} files`);
if (problems.length) { console.log(`\n❌ ${problems.length} IMPORT PROBLEM(S):`); problems.forEach(p=>console.log('  '+p)); }
else console.log('✅ Every local import resolves and every named import exists');
