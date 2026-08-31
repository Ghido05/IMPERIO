const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readSetupFile: () => ipcRenderer.invoke('read-setup-file'),
  writeSetupFile: (data) => ipcRenderer.invoke('write-setup-file', data),
  onFileOpened: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('file-opened', subscription);
    return () => ipcRenderer.removeListener('file-opened', subscription);
  },
  onSaveRequested: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('save-requested', subscription);
    return () => ipcRenderer.removeListener('save-requested', subscription);
  },
  onNewRequested: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('new-requested', subscription);
    return () => ipcRenderer.removeListener('new-requested', subscription);
  },
  broadcastState: (state) => ipcRenderer.send('broadcast-state', state),
  onStateUpdate: (callback) => {
    const subscription = (_event, state) => callback(state);
    ipcRenderer.on('state-update', subscription);
    return () => ipcRenderer.removeListener('state-update', subscription);
  },
  onViewportChanged: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('viewport-changed', subscription);
    return () => ipcRenderer.removeListener('viewport-changed', subscription);
  },
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  getAllIpAddresses: () => ipcRenderer.invoke('get-all-ip-addresses'),
  onIpadConnectionStatus: (callback) => {
    const subscription = (_event, status) => callback(status);
    ipcRenderer.on('ipad-connection-status', subscription);
    return () => ipcRenderer.removeListener('ipad-connection-status', subscription);
  },
});
