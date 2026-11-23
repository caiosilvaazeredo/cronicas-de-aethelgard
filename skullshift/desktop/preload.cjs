// Expõe ao jogo só o necessário (window.skullshiftSteam); ver src/game/platform.ts.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('skullshiftSteam', {
  personaName: ipcRenderer.sendSync('steam:name') || undefined,
  activateAchievement: (api) => ipcRenderer.send('steam:achievement', String(api)),
  setResolution: (w, h) => ipcRenderer.send('window:resolution', Number(w), Number(h)),
  quit: () => ipcRenderer.send('app:quit'),
});
