import { defineConfig } from 'vite';

// base relativa: o build funciona tanto em hospedagem web quanto empacotado (Electron/Steam).
export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
});
