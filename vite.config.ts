import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        // 函数式分包：recharts 及其专属依赖（d3 等）单独成 charts chunk，
        // 配合视图级 React.lazy，首屏不再加载图表库
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (
            /[\\/]node_modules[\\/](recharts|d3-[a-z-]+|react-smooth|react-resize-detected|victory-vendor|prop-types|react-is)[\\/]/.test(
              id,
            )
          ) {
            return 'charts'
          }
          return undefined
        },
      },
    },
  },
})
