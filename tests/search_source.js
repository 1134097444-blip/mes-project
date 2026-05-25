const fs = require('fs');
const path = require('path');

function searchFile(fp) {
  try {
    const c = fs.readFileSync(fp, 'utf8');
    if (c.includes('Fail') || c.includes('__filename') || c.includes('amis.json') || c.includes('uiSchema') || c.includes('pageId')) {
      const lines = c.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Fail') || lines[i].includes('__filename') || lines[i].includes('amis.json') || lines[i].includes('uiSchema') || lines[i].includes('pageId')) {
          console.log(path.relative('node_modules', fp) + ': L' + (i+1) + ': ' + lines[i].trim().slice(0, 200));
        }
      }
    }
  } catch(e) {}
}

function walk(dir, depth) {
  if (depth > 4) return;
  try {
    const entries = fs.readdirSync(dir, {withFileTypes: true});
    for (const x of entries) {
      if (x.name.startsWith('.')) continue;
      const f = path.join(dir, x.name);
      if (x.isDirectory() && x.name !== 'node_modules') walk(f, depth+1);
      else if ((x.name.endsWith('.js') || x.name.endsWith('.ts')) && fs.statSync(f).size < 500000) searchFile(f);
    }
  } catch(e) {}
}

walk('node_modules/@steedos/service-pages', 0);
walk('node_modules/@steedos/service-ui', 0);
console.log('DONE');
