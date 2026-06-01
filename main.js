const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// Track all open note windows
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
  const { width: workWidth, height: workHeight } = screen.getPrimaryDisplay().workAreaSize;
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

/**
 * Creates a new sticky note BrowserWindow.
 * @param {object} opts - Optional overrides: { x, y, width, height, noteId }
 */
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

  // Stagger new notes so they don't stack perfectly on top of each other
  const offset = (noteWindows.size % 8) * 28;

  const win = new BrowserWindow({
    width,
    height,
    x:               opts.x ?? Math.max(position.x - offset, 18),
    y:               opts.y ?? position.y,
    minWidth:        280,
    minHeight:       300,
    frame:           false,       // Frameless: we draw our own chrome
    transparent:     false,
    alwaysOnTop:     true,        // KEY: always float above other apps
    skipTaskbar:     false,       // Show in taskbar so user can alt-tab
    resizable:       true,
    maximizable:     true,
    fullscreenable:  false,
    hasShadow:       true,
    webPreferences: {
      nodeIntegration:    false,  // Security: keep node out of renderer
      contextIsolation:   true,
      preload:            path.join(__dirname, 'preload.js'),
    },
  });

  // Pass the unique noteId via query-string so the renderer can key localStorage
  win.loadFile('index.html', { query: { noteId } });

  if (opts.closeHome && homeWindow && !homeWindow.isDestroyed()) {
    homeWindow.close();
  }

  noteWindows.set(noteId, win);

  win.on('closed', () => {
    noteWindows.delete(noteId);
  });

  // Persist window bounds whenever the user moves or resizes
  const saveBounds = () => {
    if (!win.isDestroyed()) {
      win.webContents.send('save-bounds', win.getBounds());
    }
  };
  win.on('moved',   saveBounds);
  win.on('resized', saveBounds);

  return win;
}

// ─── App lifecycle ───────────────────────────────────────────────────────────

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
  // On Windows/Linux quit when all notes are closed
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Renderer asks for a new note window
ipcMain.on('new-note', () => {
  createNoteWindow({ closeHome: true });
});

// Renderer asks to open an existing note window
ipcMain.on('open-note', (_event, noteId) => {
  if (noteId === undefined || noteId === null || noteId === '') {
    createNoteWindow({ closeHome: true });
    return;
  }

  createNoteWindow({ noteId: String(noteId), closeHome: true });
});

// Renderer asks to delete a note and close its window if open
ipcMain.on('delete-note', (_event, noteId) => {
  const key = String(noteId ?? '');
  const win = noteWindows.get(key);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

// Renderer asks to go back to the main notes menu
ipcMain.on('back-home', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
  createHomeWindow();
});

// Home window asks to minimize itself
ipcMain.on('home-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

// Home window asks to close itself
ipcMain.on('home-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// Home window asks to toggle maximize/restore
ipcMain.on('home-toggle-restore', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

// Renderer asks to close its own window
ipcMain.on('close-note', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// Renderer asks to minimise its own window
ipcMain.on('minimize-note', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

// Renderer asks to toggle maximize/restore for note window
ipcMain.on('note-toggle-restore', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});
