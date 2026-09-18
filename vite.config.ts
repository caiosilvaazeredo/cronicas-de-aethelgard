import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // GEMINI_API_KEY não é mais injetada no bundle do cliente: todas as
    // chamadas ao Gemini passam pela Netlify Function (netlify/functions/
    // gemini.ts), que lê a chave direto de process.env no servidor.
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
