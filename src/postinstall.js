"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var sourceDir = path.join(__dirname, '..', 'node_modules', 'monaco-editor', 'min', 'vs');
var targetDir = path.join(__dirname, '..', 'out', 'vs');
function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    fs.readdirSync(from).forEach(function (element) {
        if (fs.lstatSync(path.join(from, element)).isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        }
        else {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}
try {
    copyFolderSync(sourceDir, targetDir);
    console.log('Monaco Editor files copied successfully.');
}
catch (error) {
    console.error('Error copying Monaco Editor files:', error);
    process.exit(1);
}
