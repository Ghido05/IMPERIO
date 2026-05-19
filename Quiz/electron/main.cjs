const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  createMenu();
}

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuova Presentazione',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('new-requested');
          }
        },
        {
          label: 'Apri...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            await handleOpenFile();
          }
        },
        { type: 'separator' },
        {
          label: 'Salva',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('save-requested');
          }
        },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Visualizza',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers per il File System
async function handleOpenFile() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Apri Presentazione IMPERIO',
    filters: [
      { name: 'IMPERIO Presentation', extensions: ['imp'] },
      { name: 'Tutti i file', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
      const data = JSON.parse(fileContent);
      if (mainWindow) mainWindow.webContents.send('file-opened', data);
    } catch (error) {
      dialog.showErrorBox('Errore', 'Impossibile leggere il file. Formato non valido.');
    }
  }
}

ipcMain.handle('dialog:openFile', handleOpenFile);

ipcMain.handle('dialog:saveFile', async (event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Salva Presentazione IMPERIO',
    filters: [
      { name: 'IMPERIO Presentation', extensions: ['imp'] }
    ],
    defaultPath: 'Nuova Presentazione.imp'
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
