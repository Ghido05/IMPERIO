const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imperioPrint', {
  print: () => ipcRenderer.invoke('preview-print'),
});
