const { contextBridge } = require('electron');
const fs = require('fs/promises');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  readTextAsset: async (relativePath) => {
    const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, '');
    const fullPath = path.join(__dirname, safePath);
    return fs.readFile(fullPath, 'utf8');
  },
});
