import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB로 증가
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5
                },
                networkTimeoutSeconds: 10
              }
            }
          ]
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: '천우 건설현장관리시스템',
          short_name: '천우현장관리',
          description: '천우 건설현장관리시스템 - 현장, 일정, 안전관리, 기성관리 통합 시스템',
          theme_color: '#181A20',
          background_color: '#181A20',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'icon-72x72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icon-128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icon-144x144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icon-152x152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icon-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'logo192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'logo512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          categories: ['business', 'productivity'],
          lang: 'ko-KR',
          dir: 'ltr'
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        '/naverapi': {
          target: 'https://openapi.naver.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/naverapi/, ''),
          secure: true
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      assetsDir: 'assets',
      base: '/',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@mui/material') || id.includes('@mui/icons-material') || id.includes('@emotion')) {
                return 'mui-vendor';
              }
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'firebase-vendor';
              }
              if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) {
                return 'charts-vendor';
              }
              if (id.includes('date-fns') || id.includes('@date-io')) {
                return 'date-vendor';
              }
              if (id.includes('react-beautiful-dnd') || id.includes('@hello-pangea/dnd')) {
                return 'dnd-vendor';
              }
              if (id.includes('leaflet') || id.includes('react-leaflet')) {
                return 'map-vendor';
              }
              if (id.includes('xlsx') || id.includes('jspdf')) {
                return 'export-vendor';
              }
              return 'vendor';
            }
            if (id.includes('src/')) {
              if (id.includes('pages/')) {
                return 'pages';
              }
              if (id.includes('components/')) {
                return 'components';
              }
              if (id.includes('utils/')) {
                // utils를 더 작은 청크로 분할
                if (id.includes('utils/excelUtils')) {
                  return 'utils-excel';
                }
                if (id.includes('utils/pdfUtils')) {
                  return 'utils-pdf';
                }
                if (id.includes('utils/formatUtils')) {
                  return 'utils-format';
                }
                if (id.includes('utils/performanceUtils') || id.includes('utils/mobileOptimization')) {
                  return 'utils-performance';
                }
                if (id.includes('utils/errorHandler') || id.includes('utils/commonUtils')) {
                  return 'utils-common';
                }
                return 'utils';
              }
              if (id.includes('contexts/')) {
                return 'contexts';
              }
            }
          }
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    define: {
      'process.env': {}
    }
  }
}); 