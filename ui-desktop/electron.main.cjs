const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');

let mainWindow = null;
let ballWindow = null;
let lastNormalBounds = null;

const INITIAL_WIDTH = 1200;
const INITIAL_HEIGHT = 720;
const COMPACT_WIDTH = 800;
const COMPACT_HEIGHT = 500;
const LARGE_WIDTH = 1600;
const LARGE_HEIGHT = 900;

// 尺寸映射表
const SIZE_MAP = {
  normal: { width: INITIAL_WIDTH, height: INITIAL_HEIGHT },
  compact: { width: COMPACT_WIDTH, height: COMPACT_HEIGHT },
  large: { width: LARGE_WIDTH, height: LARGE_HEIGHT },
};

function createMainWindow() {
  const mainWindowState = windowStateKeeper({
    defaultWidth: INITIAL_WIDTH,
    defaultHeight: INITIAL_HEIGHT,
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false,
    frame: false,
    skipTaskbar: false,
    transparent: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron.preload.cjs'),
    },
  });

  mainWindowState.manage(mainWindow);

  const env = process.env.NODE_ENV || 'production';
  if (env === 'development') {
    const devPort = process.env.VITE_PORT || 5174;
    mainWindow.loadURL(`http://localhost:${devPort}`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist-web', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createBallWindow(bounds) {
  const ballSize = 72;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const display = screen.getDisplayMatching(bounds);
  const { workArea } = display;

  let ballX = Math.round(centerX - ballSize / 2);
  let ballY = Math.round(centerY - ballSize / 2);
  ballX = Math.max(workArea.x, Math.min(workArea.x + workArea.width - ballSize, ballX));
  ballY = Math.max(workArea.y, Math.min(workArea.y + workArea.height - ballSize, ballY));

  ballWindow = new BrowserWindow({
    x: ballX,
    y: ballY,
    width: ballSize,
    height: ballSize,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron.preload.cjs'),
    },
  });

  const ballHtmlPath = path.join(__dirname, '../assets/ball/ball.html');
  console.log('[BallWindow] load file', ballHtmlPath);
  ballWindow.loadFile(ballHtmlPath);

  ballWindow.once('ready-to-show', () => {
    if (!ballWindow) return;
    ballWindow.show();
  });

  ballWindow.on('closed', () => {
    ballWindow = null;
  });
}

function setWindowSize(mode) {
  if (!mainWindow) return;
  const config = SIZE_MAP[mode] || SIZE_MAP.normal;
  mainWindow.setSize(config.width, config.height);
  mainWindow.center();
}

// IPC handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:close', () => app.quit());

ipcMain.handle('window:shrinkToBall', () => {
  if (!mainWindow || ballWindow) return;
  lastNormalBounds = mainWindow.getBounds();
  console.log('[Window] shrinkToBall -> storing bounds', lastNormalBounds);
  createBallWindow(lastNormalBounds);
  mainWindow.hide();
});

ipcMain.handle('window:restoreFromBall', () => {
  if (!mainWindow) return;
  if (ballWindow) {
    ballWindow.close();
    ballWindow = null;
  }
  if (lastNormalBounds) mainWindow.setBounds(lastNormalBounds);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.handle('window:toggleSize', () => {
  if (!mainWindow) return;
  const currentSize = mainWindow.getSize();
  const normalSize = SIZE_MAP.normal;
  const compactSize = SIZE_MAP.compact;
  const largeSize = SIZE_MAP.large;

  // 简单循环：normal → compact → large → normal
  if (currentSize[0] === normalSize.width && currentSize[1] === normalSize.height) {
    mainWindow.setSize(compactSize.width, compactSize.height);
  } else if (currentSize[0] === compactSize.width && currentSize[1] === compactSize.height) {
    mainWindow.setSize(largeSize.width, largeSize.height);
  } else {
    mainWindow.setSize(normalSize.width, normalSize.height);
  }
  mainWindow.center();
});

ipcMain.handle('window:setBounds', (_, bounds) => {
  if (!mainWindow) return;
  const { x, y, width, height } = bounds;
  mainWindow.setBounds({ x, y, width, height });
});

ipcMain.handle('window:sendCommand', (_, cmd) => {
  switch (cmd) {
    case 'shrinkToBall':
      ipcMain.emit('window:shrinkToBall');
      break;
    case 'restoreFromBall':
      ipcMain.emit('window:restoreFromBall');
      break;
    case 'toggleSize':
      ipcMain.emit('window:toggleSize');
      break;
    default:
      console.log('[Window] unknown command', cmd);
  }
});

app.whenReady().then(() => {
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
