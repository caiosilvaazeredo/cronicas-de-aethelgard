// Skullshift para computador: abre o build da web numa janela e liga a Steam (se estiver aberta).
const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const { pathToFileURL } = require('url');

// O jogo é servido por app://skullshift/ (e não file://): módulos JS, fetch das fontes e o
// carregador do Phaser funcionam como na web.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const fs = require('fs');
const path = require('path');

/** App ID da Steam: troque 480 (Spacewar, o app de teste da Valve) pelo ID do jogo. */
function appId() {
  for (const p of [path.join(process.cwd(), 'steam_appid.txt'), path.join(path.dirname(process.execPath), 'steam_appid.txt'), path.join(__dirname, 'steam_appid.txt')]) {
    try {
      const n = parseInt(fs.readFileSync(p, 'utf8'), 10);
      if (n) return n;
    } catch {
      /* próximo */
    }
  }
  return 480;
}

let steam = null;
try {
  const sw = require('steamworks.js');
  steam = sw.init(appId());
  sw.electronEnableSteamOverlay();
} catch (e) {
  console.warn('Steam indisponível, o jogo roda sem ela:', e && e.message);
}

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    useContentSize: true,
    backgroundColor: '#0e1a2b',
    autoHideMenuBar: true,
    title: 'Skullshift',
    icon: path.join(__dirname, 'game', 'icons', 'icon-512.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  win.setMenu(null);
  win.loadURL('app://skullshift/index.html');
  // F11 alterna a tela cheia, como nos jogos de PC.
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

ipcMain.on('steam:name', (e) => {
  try {
    e.returnValue = steam ? steam.localplayer.getName() : '';
  } catch {
    e.returnValue = '';
  }
});
ipcMain.on('steam:achievement', (_e, api) => {
  try {
    if (steam && !steam.achievement.isActivated(api)) steam.achievement.activate(api);
  } catch (err) {
    console.warn('Conquista não enviada:', api, err && err.message);
  }
});
ipcMain.on('window:resolution', (_e, w, h) => {
  if (!win || win.isFullScreen()) return;
  win.setContentSize(w, h);
  win.center();
});
ipcMain.on('app:quit', () => app.quit());

app.whenReady().then(() => {
  const root = path.join(__dirname, 'game');
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '');
    const file = path.normalize(path.join(root, rel || 'index.html'));
    if (!file.startsWith(root)) return new Response('', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
