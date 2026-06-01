const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

const noteWindows = new Map();
let homeWindow = null;
let noteIdCounter = 0;

function focusWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.focus();
}

function getNextNoteId() {
  const timestamp = Date.now().toString(36);
  const counter = (noteIdCounter++).toString(36);
  return `note-${timestamp}-${counter}`;
}

function getTopRightPosition(width, height) {
  const { width: workWidth } = screen.getPrimaryDisplay().workAreaSize;
  const margin = 18;

  return {
    x: Math.max(margin, workWidth - width - margin),
    y: Math.max(margin, margin),
  };
}

function createHomeWindow() {
  if (homeWindow && !homeWindow.isDestroyed()) {
    focusWindow(homeWindow);
    return homeWindow;
  }

  homeWindow = new BrowserWindow({
    width: 620,
    height: 420,
    minWidth: 560,
    minHeight: 380,
    frame: false,
    transparent: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: true,
    maximizable: true,
    fullscreenable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  homeWindow.loadFile('home.html');

  homeWindow.on('closed', () => {
    homeWindow = null;
  });

  return homeWindow;
}

function createNoteWindow(opts = {}) {
  const noteId = String(opts.noteId ?? getNextNoteId());
  const width = opts.width ?? 360;
  const height = opts.height ?? 420;
  const position = getTopRightPosition(width, height);

  const existing = noteWindows.get(noteId);
  if (existing && !existing.isDestroyed()) {
    if (opts.closeHome && homeWindow && !homeWindow.isDestroyed()) {
      homeWindow.close();
    }
    existing.setPosition(position.x, position.y, false);
    focusWindow(existing);
    return existing;
  }

  const offset = (noteWindows.size % 8) * 28;

  const win = new BrowserWindow({
    width,
    height,
    x:               opts.x ?? Math.max(position.x - offset, 18),
    y:               opts.y ?? position.y,
    minWidth:        280,
    minHeight:       300,
    frame:           false,
    transparent:     false,
    alwaysOnTop:     true,
    skipTaskbar:     false,
    resizable:       true,
    maximizable:     true,
    fullscreenable:  false,
    hasShadow:       true,
    webPreferences: {
      nodeIntegration:    false,
      contextIsolation:   true,
      preload:            path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html', { query: { noteId } });

  if (opts.closeHome && homeWindow && !homeWindow.isDestroyed()) {
    homeWindow.close();
  }

  noteWindows.set(noteId, win);

  win.on('closed', () => {
    noteWindows.delete(noteId);
  });

  const saveBounds = () => {
    if (!win.isDestroyed()) {
      win.webContents.send('save-bounds', win.getBounds());
    }
  };
  win.on('moved',   saveBounds);
  win.on('resized', saveBounds);

  return win;
}

app.whenReady().then(() => {
  createHomeWindow();

  app.on('activate', () => {
    if (!homeWindow || homeWindow.isDestroyed()) {
      createHomeWindow();
    } else {
      focusWindow(homeWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
ipcMain.on('new-note', () => {
  createNoteWindow({ closeHome: true });
});
ipcMain.on('open-note', (_event, noteId) => {
  if (noteId === undefined || noteId === null || noteId === '') {
    createNoteWindow({ closeHome: true });
    return;
  }

  createNoteWindow({ noteId: String(noteId), closeHome: true });
});
ipcMain.on('delete-note', (_event, noteId) => {
  const key = String(noteId ?? '');
  const win = noteWindows.get(key);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});
ipcMain.on('back-home', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
  createHomeWindow();
});
ipcMain.on('home-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.on('home-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});
ipcMain.on('home-toggle-restore', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});
ipcMain.on('close-note', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});
ipcMain.on('minimize-note', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
