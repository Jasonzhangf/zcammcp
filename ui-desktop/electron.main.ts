import { app, BrowserWindow, ipcMain, Tray, Menu, screen } from 'electron';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuiting = false;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: width - 820,
    y: height - 620,
    show: false,
    frame: false,
    skipTaskbar: true,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'electron.preload.cjs'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist-web', 'index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(join(__dirname, '../assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: '缩小成球',
      click: () => {
        if (mainWindow) {
          mainWindow.setSize(60, 60);
          mainWindow.setAlwaysOnTop(true);
          mainWindow.center();
          mainWindow.show();
        }
      },
    },
    {
      label: '恢复正常',
      click: () => {
        if (mainWindow) {
          mainWindow.setSize(800, 600);
          mainWindow.setAlwaysOnTop(true);
          mainWindow.center();
          mainWindow.show();
        }
      },
    },
    {
      label: '退出',
      click: () => {
        isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('ZCAM 相机控制');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

ipcMain.handle('shrink-to-ball', () => {
  if (mainWindow) {
    mainWindow.setSize(60, 60);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.center();
  }
});

ipcMain.handle('restore-size', () => {
  if (mainWindow) {
    mainWindow.setSize(800, 600);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.center();
  }
});

ipcMain.handle('dock-to-edge', () => {
  if (mainWindow) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(width - 820, height - 620);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.show();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuiting = true;
});
