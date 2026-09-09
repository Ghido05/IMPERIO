const { app, BrowserWindow, ipcMain, dialog, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const net = require('net');

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

function getAllIpAddresses() {
  const interfaces = os.networkInterfaces();
  const validAddresses = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    
    // Escludiamo interfacce virtuali, VPN, ponti e adattatori di servizio
    if (
      lowerName.includes('virtual') ||
      lowerName.includes('vpn') ||
      lowerName.includes('vbox') ||
      lowerName.includes('vmnet') ||
      lowerName.includes('utun') ||
      lowerName.includes('docker') ||
      lowerName.includes('bridge') ||
      lowerName.includes('awdl') ||
      lowerName.includes('p2p') ||
      lowerName.includes('gif') ||
      lowerName.includes('stf') ||
      lowerName.includes('ap0')
    ) {
      continue;
    }

    for (const iface of interfaces[name]) {
      // Filtriamo IPv4 non interni e che non siano link-local (169.254.x.x)
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        validAddresses.push({
          name: name,
          address: iface.address
        });
      }
    }
  }
  return validAddresses;
}

function getLocalIpAddress() {
  const validAddresses = getAllIpAddresses();

  if (validAddresses.length === 0) {
    return 'localhost';
  }

  // Diamo priorità alle interfacce di rete fisiche (en0, en1, en*, wlan*, eth*)
  const priorityPatterns = ['en0', 'en1', 'en', 'wlan', 'wlo', 'eth'];
  for (const pattern of priorityPatterns) {
    const found = validAddresses.find(addr => addr.name.toLowerCase().startsWith(pattern));
    if (found) {
      return found.address;
    }
  }

  // Fallback sul primo IP non interno valido trovato
  return validAddresses[0].address;
}

function startLocalServer() {
  const expressApp = express();
  
  // Abilita CORS per compatibilità con Safari / iPad
  expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  const distPath = path.join(__dirname, '../dist');

  // In Development Mode (npm run dev), inoltra le richieste HTTP a Vite su 5173
  if (process.env.NODE_ENV === 'development') {
    expressApp.use((req, res, next) => {
      if (req.headers.upgrade === 'websocket') return next();
      const proxyReq = http.request(
        `http://127.0.0.1:5173${req.url}`,
        { method: req.method, headers: req.headers },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      );
      proxyReq.on('error', () => {
        // Fallback a dist se il server di dev non risponde
        next();
      });
      req.pipe(proxyReq, { end: true });
    });
  }
  
  // Serve static dist folder in production
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
    try {
      const host = request.headers.host || 'localhost';
      const { pathname } = new URL(request.url, `http://${host}`);
      if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (e) {
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

ipcMain.handle('get-all-ip-addresses', () => {
  const addresses = getAllIpAddresses();
  return {
    addresses: addresses,
    defaultIp: getLocalIpAddress(),
    port: activePort
  };
});

function checkPort(host, port = 81, timeout = 600) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(host);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(null);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(null);
    });
    socket.connect(port, host);
  });
}

async function findBuzzerIp(preferredIp) {
  // 1. Prova l'IP fornito/salvato
  if (preferredIp) {
    const ok = await checkPort(preferredIp, 81, 700);
    if (ok) return ok;
  }

  // 2. Prova host mDNS e IP tipici (es. Access Point ESP32 o IP recenti)
  const commonHosts = [
    '192.168.1.97',
    '192.168.1.65',
    '192.168.4.1', // Default Access Point ESP32
    'esp32.local',
    'imperio-buzzer.local',
    'pulsantiera.local'
  ];

  for (const host of commonHosts) {
    if (host !== preferredIp) {
      const ok = await checkPort(host, 81, 400);
      if (ok) return ok;
    }
  }

  // 3. Scansione rapida della sottorete locale (porta 81)
  const interfaces = getAllIpAddresses();
  for (const iface of interfaces) {
    const parts = iface.address.split('.');
    if (parts.length === 4) {
      const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
      const candidates = [];
      for (let i = 1; i <= 254; i++) {
        const ip = `${prefix}${i}`;
        if (ip !== iface.address) {
          candidates.push(ip);
        }
      }

      // Esegui in blocchi concorrenti da 50 socket
      for (let i = 0; i < candidates.length; i += 50) {
        const chunk = candidates.slice(i, i + 50);
        const results = await Promise.all(chunk.map(ip => checkPort(ip, 81, 600)));
        const found = results.find(Boolean);
        if (found) return found;
      }
    }
  }

  return null;
}

ipcMain.handle('find-buzzer-ip', async (event, currentIp) => {
  return await findBuzzerIp(currentIp);
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
