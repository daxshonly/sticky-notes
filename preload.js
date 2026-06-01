const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  newNote: ()       => ipcRenderer.send('new-note'),
  openNote: (noteId) => ipcRenderer.send('open-note', noteId),
  deleteNote: (noteId) => ipcRenderer.send('delete-note', noteId),
  backHome: () => ipcRenderer.send('back-home'),
  homeMinimize: () => ipcRenderer.send('home-minimize'),
  homeClose: () => ipcRenderer.send('home-close'),
  homeToggleRestore: () => ipcRenderer.send('home-toggle-restore'),
  closeNote: ()     => ipcRenderer.send('close-note'),
  minimizeNote: ()  => ipcRenderer.send('minimize-note'),
  onSaveBounds: (callback) =>
    ipcRenderer.on('save-bounds', (_event, bounds) => callback(bounds)),
});
