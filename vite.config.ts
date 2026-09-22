import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

const BASE_PATH = '/allen-kim-nomenclature-match/'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  base: BASE_PATH,
  server: {
    port: 3000,
    open: true,
  },
})
