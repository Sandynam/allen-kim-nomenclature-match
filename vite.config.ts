import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BASE_PATH = '/allen-kim-brain-regions-acronyms/';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  base: BASE_PATH,
  server: {
    port: 3000,
    open: true
  }
})
