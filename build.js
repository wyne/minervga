import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting production build process...');

// Step 1: Clean the dist and server/public directories
console.log('Cleaning directories...');
const serverPublicDir = path.join(__dirname, 'server', 'public');
const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(serverPublicDir)) {
  fs.rmSync(serverPublicDir, { recursive: true });
}
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}

// Step 2: Build the application
console.log('Building application...');
execSync('npx vite build', { stdio: 'inherit' });

// Step 3: Ensure server/public directory exists
console.log('Creating server/public directory...');
fs.mkdirSync(serverPublicDir, { recursive: true });

// Step 4: Copy build files to server/public
console.log('Copying build files to server/public...');
const distPublicDir = path.join(distDir, 'public');

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

copyRecursive(distPublicDir, serverPublicDir);
console.log('Build process complete!');
