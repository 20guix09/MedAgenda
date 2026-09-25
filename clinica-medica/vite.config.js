// configuração do Vite

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: isCodexSeatbeltSandbox
      ? {
          useFsEvents: false,
          usePolling: true,
        }
      : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
