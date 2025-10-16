// Node script to copy popup build => extension/_local_static_ and create popup.html
const fs = require('fs-extra');
const path = require('path');

const root = path.resolve(__dirname, '..');
const popupBuild = path.join(root, 'popup', 'dist'); // vite default output is 'dist'
const extDir = path.join(root, 'extension');
const dest = path.join(extDir, '_local_static_');

async function copyBuild() {
  if(!fs.existsSync(popupBuild)) {
    console.error('popup build not found. run `cd popup && npm run build` first.');
    process.exit(1);
  }
  await fs.remove(dest);
  await fs.copy(popupBuild, dest);
  // read dist/index.html and write as extension/popup.html with adjusted asset paths
  const indexHtml = await fs.readFile(path.join(dest, 'index.html'), 'utf8');
  // Vite uses relative paths because base='./' in config; index.html should reference ./assets
  await fs.writeFile(path.join(extDir, 'popup.html'), indexHtml, 'utf8');
  console.log('Copied popup build to extension/_local_static_ and created extension/popup.html');
}

copyBuild().catch(e => { console.error(e); process.exit(1); });
