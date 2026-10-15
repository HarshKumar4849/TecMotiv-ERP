const fs = require('fs');
const path = require('path');

const virtualDir = path.resolve(__dirname, '../.vercel/output/services/backend/functions/index.func/_virtual');
if (fs.existsSync(virtualDir)) {
  const files = fs.readdirSync(virtualDir);
  let patched = 0;
  for (const file of files) {
    if (file.endsWith('.cjs')) {
      const fullPath = path.join(virtualDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('..\\backendpackage.json')) {
        fs.writeFileSync(fullPath, content.replace(/\.\.\\backendpackage\.json/g, '../backend/package.json'), 'utf8');
        patched++;
      }
    }
  }
  if (patched > 0) {
    console.log(`[patch-vercel-shims] Successfully patched ${patched} Rolldown Windows path shims.`);
  }
}
