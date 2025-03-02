import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy to all possible locations that might be needed
const srcDir = path.join(__dirname, 'dist', 'public');
const serverDestDir = path.join(__dirname, 'server', 'public');
const rootDestDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist'); // Add dist directory

if (!fs.existsSync(srcDir)) {
  console.error('Source directory does not exist:', srcDir);
  process.exit(1);
}

[serverDestDir, rootDestDir].forEach(destDir => {
  fs.mkdirSync(destDir, { recursive: true });

  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(srcDir, destDir);
  console.log(`Copied ${srcDir} to ${destDir}`);
});