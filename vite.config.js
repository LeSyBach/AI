import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,      // Move to 8080 to avoid 3000/5173 conflicts
    strictPort: false, // If 8080 is busy, try 8081, 8082...
    host: true,       // Expose to network
  },
});