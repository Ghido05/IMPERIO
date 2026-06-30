const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let presenterWindow;
let gamesWindow;
let scoresWindow;

function createWindows() {
  const commonWebPreferences = {
    preload: path.join(__dirname, 'preload.cjs'),
    nodeIntegration: false,
    contextIsolation: true,
  };

  // 1. Presenter Window
  presenterWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'IMPERIO - Relatore',
    webPreferences: commonWebPreferences
  });

  // 2. Games Window
  gamesWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    useContentSize: true,
    fullscreenable: true,
    backgroundColor: '#000000',
    title: 'IMPERIO - Giochi',
    webPreferences: commonWebPreferences
  });

  // 3. Scores Window
  scoresWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    useContentSize: true,
    fullscreenable: true,
    backgroundColor: '#000000',
    title: 'IMPERIO - Punti',
    webPreferences: commonWebPreferences
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    presenterWindow.loadURL('http://localhost:5173/?mode=presenter');
    gamesWindow.loadURL('http://localhost:5173/?mode=games');
    scoresWindow.loadURL('http://localhost:5173/?mode=scores');
    
    // Optional: open devtools on presenter by default
    presenterWindow.webContents.openDevTools();
  } else {
    presenterWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: 'presenter' } });
    gamesWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: 'games' } });
    scoresWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: 'scores' } });
  }

  // Handle close events to avoid errors when interacting with closed windows
  presenterWindow.on('closed', () => { presenterWindow = null; });
  gamesWindow.on('closed', () => { gamesWindow = null; });
  scoresWindow.on('closed', () => { scoresWindow = null; });

  [gamesWindow, scoresWindow].forEach((win) => {
    if (!win) return;
    const notifyViewport = () => {
      setTimeout(() => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('viewport-changed');
        }
      }, 50);
    };
    win.on('enter-full-screen', notifyViewport);
    win.on('leave-full-screen', notifyViewport);
    win.on('resize', notifyViewport);
  });

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
            if (presenterWindow) presenterWindow.webContents.send('new-requested');
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
            if (presenterWindow) presenterWindow.webContents.send('save-requested');
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
  const { canceled, filePaths } = await dialog.showOpenDialog(presenterWindow, {
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
      if (presenterWindow) presenterWindow.webContents.send('file-opened', data);
    } catch (error) {
      dialog.showErrorBox('Errore', 'Impossibile leggere il file. Formato non valido.');
    }
  }
}

ipcMain.handle('dialog:openFile', handleOpenFile);

ipcMain.handle('dialog:saveFile', async (event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(presenterWindow, {
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

// IPC Handler for State Synchronization
ipcMain.on('broadcast-state', (event, state) => {
  // Broadcast state to all windows except the sender
  if (presenterWindow && event.sender !== presenterWindow.webContents) {
    presenterWindow.webContents.send('state-update', state);
  }
  if (gamesWindow && event.sender !== gamesWindow.webContents) {
    gamesWindow.webContents.send('state-update', state);
  }
  if (scoresWindow && event.sender !== scoresWindow.webContents) {
    scoresWindow.webContents.send('state-update', state);
  }
});

app.whenReady().then(() => {
  createWindows();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindows();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
