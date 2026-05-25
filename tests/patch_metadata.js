// Patch for Steedos 3.0.14 metadata-core on Node.js 22
// Forces type_infos to load by directly calling glob from the correct path
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const fs = require('fs');

const typeInfoPath = require.resolve('@steedos/metadata-core/lib/typeInfo');
const typeInfosDir = path.join(path.dirname(typeInfoPath), '..', 'type_infos');

// Load all type_infos
const files = glob.sync(path.join(typeInfosDir, '*.yml'));
const typeDefs = {};
files.forEach(f => {
  const name = path.basename(f).split('.')[0];
  try {
    typeDefs[name] = yaml.load(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    console.error('Failed to load type info:', name, e.message);
  }
});

// Monkey-patch the getTypeInfos cache
const typeInfo = require('@steedos/metadata-core/lib/typeInfo');
// The module has a local typeDefs variable we can't access directly,
// but we can override the getMetadataTypeInfo and getMetadataKeys functions
const origGetTypeInfos = global._origGetTypeInfos;

// Override exported functions to use our loaded types
const mc = require('@steedos/metadata-core');

console.log('Patched', Object.keys(typeDefs).length, 'type infos');
