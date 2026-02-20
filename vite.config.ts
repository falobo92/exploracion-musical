import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/youtube-search': {
        target: 'https://www.googleapis.com',
        changeOrigin: true,
        rewrite: (p) => {
          const url = new URL(p, 'http://localhost');
          const q = url.searchParams.get('q') || '';
          const key = process.env.VITE_YOUTUBE_API_KEY || '';
          return `/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(q)}&maxResults=5&type=video&videoEmbeddable=true&key=${key}`;
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
