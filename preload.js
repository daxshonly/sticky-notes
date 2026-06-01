/**
 * preload.js
 * Runs in a privileged context with access to Node APIs.
 * Exposes a minimal, typed API to the renderer via contextBridge.
 * This is the recommended secure pattern — no nodeIntegration needed.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Ask main to open a new sticky note window */
  newNote: ()       => ipcRenderer.send('new-note'),

  /** Open an existing sticky note window */
  openNote: (noteId) => ipcRenderer.send('open-note', noteId),

  /** Delete a sticky note */
  deleteNote: (noteId) => ipcRenderer.send('delete-note', noteId),

  /** Return to the main notes menu */
  backHome: () => ipcRenderer.send('back-home'),

  /** Home window controls */
  homeMinimize: () => ipcRenderer.send('home-minimize'),
  homeClose: () => ipcRenderer.send('home-close'),
  homeToggleRestore: () => ipcRenderer.send('home-toggle-restore'),

  /** Close this note window */
  closeNote: ()     => ipcRenderer.send('close-note'),

  /** Minimise this note window */
  minimizeNote: ()  => ipcRenderer.send('minimize-note'),

  /** Toggle maximise/restore for this note window */
  noteToggleRestore: () => ipcRenderer.send('note-toggle-restore'),

  /**
   * Register a callback that fires whenever the main process
   * reports updated window bounds (after a move or resize).
   * @param {function({x,y,width,height}):void} callback
   */
  onSaveBounds: (callback) =>
    ipcRenderer.on('save-bounds', (_event, bounds) => callback(bounds)),
});
