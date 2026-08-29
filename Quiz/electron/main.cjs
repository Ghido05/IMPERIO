const { app, BrowserWindow, ipcMain, dialog, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');

// Disable autoplay gesture requirements
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let presenterWindow;
let gamesWindow;
let scoresWindow;
let activePort = 3001;

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
    // presenterWindow.webContents.openDevTools();
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

ipcMain.handle('read-setup-file', async () => {
  const devPath = path.join(__dirname, '../src/data/quiz_setup_config.json');
  const prodPath = path.join(app.getPath('userData'), 'quiz_setup_config.json');
  
  if (fs.existsSync(devPath)) {
    try {
      return JSON.parse(fs.readFileSync(devPath, 'utf-8'));
    } catch (e) {
      console.error("Errore lettura dev setup file:", e);
    }
  }
  if (fs.existsSync(prodPath)) {
    try {
      return JSON.parse(fs.readFileSync(prodPath, 'utf-8'));
    } catch (e) {
      console.error("Errore lettura prod setup file:", e);
    }
  }
  return null;
});

ipcMain.handle('write-setup-file', async (event, data) => {
  const devDir = path.join(__dirname, '../src/data');
  const devPath = path.join(devDir, 'quiz_setup_config.json');
  const prodPath = path.join(app.getPath('userData'), 'quiz_setup_config.json');
  
  let success = false;
  if (fs.existsSync(devDir)) {
    try {
      fs.writeFileSync(devPath, JSON.stringify(data, null, 2), 'utf-8');
      success = true;
    } catch (e) {
      console.error("Errore scrittura dev setup file:", e);
    }
  }
  try {
    fs.writeFileSync(prodPath, JSON.stringify(data, null, 2), 'utf-8');
    success = true;
  } catch (e) {
    console.error("Errore scrittura prod setup file:", e);
  }
  return { success };
});

let localServer;
let wss;
const clients = new Set();
let latestSlides = null;
let latestActiveSlideId = '';
let latestActiveSlide = null;
const latestLocalStorage = {};

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function startLocalServer() {
  const expressApp = express();
  
  // Serve static dist folder in production
  const distPath = path.join(__dirname, '../dist');
  expressApp.use(express.static(distPath));
  
  // Fallback to index.html for SPA
  expressApp.use((req, res, next) => {
    if (req.headers.upgrade === 'websocket' || req.method !== 'GET') return next();
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.send('IMPERIO Local Server (Vite Development Mode active). Load from http://localhost:5173/?mode=ipad');
    }
  });

  localServer = http.createServer(expressApp);
  
  wss = new WebSocketServer({ noServer: true });
  
  localServer.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    broadcastConnectionStatus();
    
    // Send initial state to the newly connected client
    ws.send(JSON.stringify({
      type: 'init-state',
      data: {
        slides: latestSlides,
        activeSlideId: latestActiveSlideId,
        activeSlide: latestActiveSlide,
        localStorage: latestLocalStorage
      }
    }));
    
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        if (msg.type === 'request-state') {
          ws.send(JSON.stringify({
            type: 'init-state',
            data: {
              slides: latestSlides,
              activeSlideId: latestActiveSlideId,
              activeSlide: latestActiveSlide,
              localStorage: latestLocalStorage
            }
          }));
        } else if (msg.type === 'local-storage-update') {
          const update = msg.data;
          latestLocalStorage[update.key] = update.value;
          
          // Forward state update to all Electron windows
          const ipcState = { localStorageUpdate: update };
          if (presenterWindow && !presenterWindow.webContents.isDestroyed()) {
            presenterWindow.webContents.send('state-update', ipcState);
          }
          if (gamesWindow && !gamesWindow.webContents.isDestroyed()) {
            gamesWindow.webContents.send('state-update', ipcState);
          }
          if (scoresWindow && !scoresWindow.webContents.isDestroyed()) {
            scoresWindow.webContents.send('state-update', ipcState);
          }
          
          // Broadcast to all OTHER WebSocket clients
          const wsMessage = JSON.stringify({
            type: 'local-storage-update',
            data: update
          });
          for (const client of clients) {
            if (client !== ws && client.readyState === 1) { // 1 = OPEN
              client.send(wsMessage);
            }
          }
        }
      } catch (err) {
        console.error('Error handling websocket message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastConnectionStatus();
    });

    ws.on('error', () => {
      clients.delete(ws);
      broadcastConnectionStatus();
    });
  });

  function tryListen() {
    localServer.listen(activePort, '0.0.0.0', () => {
      console.log(`Server locale dell'iPad avviato su http://${getLocalIpAddress()}:${activePort}`);
    });
  }

  localServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Porta ${activePort} già in uso, provo la porta successiva ${activePort + 1}...`);
      activePort++;
      tryListen();
    } else {
      console.error("Errore del server locale:", err);
    }
  });

  tryListen();
}

function broadcastConnectionStatus() {
  const status = {
    ipadConnected: clients.size > 0,
    ipadCount: clients.size
  };
  if (presenterWindow && !presenterWindow.webContents.isDestroyed()) {
    presenterWindow.webContents.send('ipad-connection-status', status);
  }
}

// IPC Handler for State Synchronization
ipcMain.on('broadcast-state', (event, state) => {
  if (state.slides !== undefined) latestSlides = state.slides;
  if (state.activeSlideId !== undefined) latestActiveSlideId = state.activeSlideId;
  if (state.activeSlide !== undefined) latestActiveSlide = state.activeSlide;
  if (state.localStorageUpdate) {
    const { key, value } = state.localStorageUpdate;
    latestLocalStorage[key] = value;
  }

  // Broadcast state to all windows except the sender
  if (presenterWindow && event.sender !== presenterWindow.webContents && !presenterWindow.webContents.isDestroyed()) {
    presenterWindow.webContents.send('state-update', state);
  }
  if (gamesWindow && event.sender !== gamesWindow.webContents && !gamesWindow.webContents.isDestroyed()) {
    gamesWindow.webContents.send('state-update', state);
  }
  if (scoresWindow && event.sender !== scoresWindow.webContents && !scoresWindow.webContents.isDestroyed()) {
    scoresWindow.webContents.send('state-update', state);
  }

  // Forward updates to connected web clients
  const wsMessage = JSON.stringify({
    type: state.localStorageUpdate ? 'local-storage-update' : 'state-update',
    data: state.localStorageUpdate ? state.localStorageUpdate : {
      slides: latestSlides,
      activeSlideId: latestActiveSlideId,
      activeSlide: latestActiveSlide
    }
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(wsMessage);
    }
  }
});

ipcMain.handle('get-server-url', () => {
  const ip = getLocalIpAddress();
  return `http://${ip}:${activePort}`;
});

app.whenReady().then(() => {
  // Configura i permessi per la Web Serial API sulla sessione di default
  session.defaultSession.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (portList && portList.length > 0) {
      // Cerca una porta ESP32/serial tipica o ripiega sulla prima
      const espPort = portList.find(device => 
        device.portName.includes('usbserial') || 
        device.portName.includes('usbmodem') || 
        device.portName.includes('ttyUSB') || 
        device.portName.includes('COM')
      ) || portList[0];
      console.log(`Porta seriale auto-selezionata in Electron: ${espPort.portName} (${espPort.portId})`);
      callback(espPort.portId);
    } else {
      callback(''); // Nessuna porta trovata
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'serial') {
      return true;
    }
    return false;
  });

  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') {
      return true;
    }
    return false;
  });

  startLocalServer();
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
