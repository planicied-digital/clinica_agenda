import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Painel servido sob /sistemas/agendaclinica/ (proxy reverso no nginx do
  // host) em vez da raiz do domínio — precisa bater com o location do nginx.
  base: '/sistemas/agendaclinica/',
  server: {
    port: 5173,
  },
});
