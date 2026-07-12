const fs = require('fs'), path = require('path');
const parser = require('@babel/parser');
const errors = [];
let count = 0;
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (f !== 'node_modules') walk(p); continue; }
    if (!/\.(jsx?|js)$/.test(f)) continue;
    count++;
    const src = fs.readFileSync(p, 'utf8');
    try {
      parser.parse(src, { sourceType: 'unambiguous', plugins: ['jsx'], errorRecovery: false });
    } catch (e) {
      errors.push(`${p.replace(process.cwd()+'/','')}:${e.loc ? e.loc.line+':'+e.loc.column : '?'}  ${e.message.split('(')[0].trim()}`);
    }
  }
}
walk('src');
console.log(`Parsed ${count} files`);
if (errors.length) { console.log(`\n❌ ${errors.length} SYNTAX ERROR(S):`); errors.forEach(e => console.log('  ' + e)); }
else console.log('✅ ZERO syntax errors — every file parses as valid JS/JSX');
