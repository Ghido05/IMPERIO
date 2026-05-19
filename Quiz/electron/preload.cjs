const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  onFileOpened: (callback) => {
    ipcRenderer.on('file-opened', (_event, data) => callback(data));
  },
  onSaveRequested: (callback) => {
    ipcRenderer.on('save-requested', () => callback());
  },
  onNewRequested: (callback) => {
    ipcRenderer.on('new-requested', () => callback());
  }
});
