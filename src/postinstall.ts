import * as fs from 'fs';
import * as path from 'path';

const sourceDir = path.join(__dirname, '..', 'node_modules', 'monaco-editor', 'min', 'vs');
const targetDir = path.join(__dirname, '..', 'out', 'vs');

function copyFolderSync(from: string, to: string) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }

  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

copyFolderSync(sourceDir, targetDir);

console.log('Monaco Editor files copied successfully.');