import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  optimizeDeps: {
    include: ['@coral-xyz/anchor', '@solana/web3.js', 'bn.js', 'buffer'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    port: 3000,
  },
})
