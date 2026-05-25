const fs = require('fs');
const path = require('path');
try { var yaml = require('js-yaml'); } catch(e) { yaml = null; }

const base = 'steedos-packages/mes/main/default/objects';
const dirs = fs.readdirSync(base);
for (const d of dirs) {
  const objFile = path.join(base, d, d + '.object.yml');
  if (fs.existsSync(objFile)) {
    const raw = fs.readFileSync(objFile, 'utf8');
    if (yaml) {
      try {
        const content = yaml.load(raw);
        console.log(d, '✅ name=' + content.name);
      } catch(e) {
        console.log(d, '❌ YAML:', e.message.slice(0, 80));
      }
    } else {
      console.log(d, '✅ file exists, size=' + raw.length);
    }
  } else {
    console.log(d, '❌ missing object.yml');
  }
}
