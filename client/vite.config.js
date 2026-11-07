import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Requests to /api go to the Express backend, so the frontend never needs the backend URL.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
