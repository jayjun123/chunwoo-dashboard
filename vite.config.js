import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 환경변수 로드
  const env = loadEnv(mode, process.cwd(), '')
  
  // 환경변수 디버깅
  if (command === 'build') {
    console.log('🔧 빌드 환경변수 확인:')
    console.log('- VITE_MASTER_EMAIL:', env.VITE_MASTER_EMAIL || '설정되지 않음')
    console.log('- VITE_FIREBASE_PROJECT_ID:', env.VITE_FIREBASE_PROJECT_ID || '설정되지 않음')
    console.log('- NODE_ENV:', process.env.NODE_ENV)
    console.log('- MODE:', mode)
  }
  
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png', 'icon-72x72.png', 'icon-96x96.png', 'icon-128x128.png', 'icon-144x144.png', 'icon-152x152.png', 'icon-384x384.png'],
      manifest: {
        name: '천우 건설현장관리시스템',
        short_name: '천우현장관리',
        description: '천우 건설현장관리시스템 - 현장, 일정, 안전관리, 기성관리 통합 시스템',
        theme_color: '#181A20',
        background_color: '#181A20',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'ko-KR',
        dir: 'ltr',
        prefer_related_applications: false,
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          },
          {
            src: 'logo192.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'any maskable'
          },
          {
            src: 'logo512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any maskable'
          },
          {
            src: 'icon-72x72.png',
            type: 'image/png',
            sizes: '72x72',
            purpose: 'any maskable'
          },
          {
            src: 'icon-96x96.png',
            type: 'image/png',
            sizes: '96x96',
            purpose: 'any maskable'
          },
          {
            src: 'icon-128x128.png',
            type: 'image/png',
            sizes: '128x128',
            purpose: 'any maskable'
          },
          {
            src: 'icon-144x144.png',
            type: 'image/png',
            sizes: '144x144',
            purpose: 'any maskable'
          },
          {
            src: 'icon-152x152.png',
            type: 'image/png',
            sizes: '152x152',
            purpose: 'any maskable'
          },
          {
            src: 'icon-384x384.png',
            type: 'image/png',
            sizes: '384x384',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: 'screenshot-narrow.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB로 증가
        globIgnores: ['**/opencv.js'], // opencv.js 파일은 캐시에서 제외
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 31536000
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
                maxAgeSeconds: 31536000
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/analytics'],
          'charts-vendor': ['recharts'],
          'dnd-vendor': ['react-beautiful-dnd'],
          'date-vendor': ['date-fns'],
          'export-vendor': ['xlsx', 'jspdf', 'jspdf-autotable'],
          'vendor': ['react-router-dom', 'redux', '@reduxjs/toolkit'],
          'pages': [
            './src/pages/Safety.jsx',
            './src/pages/Estimates.jsx',
            './src/pages/Claims.jsx',
            './src/pages/GanttChart.jsx'
          ],
          'components': [
            './src/components/safety/SafetyInspections.jsx',
            './src/components/safety/SafetyIncidents.jsx',
            './src/components/safety/SafetyTraining.jsx',
            './src/components/safety/SafetyReports.jsx'
          ],
          'contexts': [
            './src/contexts/AuthContext.jsx',
            './src/contexts/TodoContext.jsx',
            './src/contexts/ThemeContext.jsx',
            './src/contexts/PopupContext.jsx'
          ],
          'utils-excel': ['./src/utils/excelUtils.jsx'],
          'utils-estimate': ['./src/utils/estimateUtils.js', './src/utils/excelCommonUtils.js', './src/utils/templateUrls.js'],
          'utils-pdf': ['./src/utils/pdfUtils.js'],
          'utils-performance': ['./src/utils/performanceUtils.js'],
          'utils-format': ['./src/utils/formatUtils.js'],
          'utils-common': ['./src/utils/commonUtils.js', './src/utils/errorHandler.js'],
          'utils': [
            './src/utils/imeHandler.jsx',
            './src/utils/pwaKeyboardUtils.js',
            './src/utils/mobileOptimization.js',
            './src/utils/windowManager.js',
            './src/utils/notificationUtils.js',
            './src/utils/backButtonHandler.js',
            './src/utils/recurringScheduleUtils.js'
          ]
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: false, // 배포 환경에서도 콘솔 로그 유지
        drop_debugger: true,
        pure_funcs: [] // 콘솔 함수 제거하지 않음
      },
      mangle: {
        keep_fnames: true // 함수명 유지
      }
    },
    define: {
      'process.env': {},
      'global': 'globalThis'
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@mui/material', '@mui/icons-material']
    }
  },
  server: {
    port: 3000,
    host: true
  }
  }
}) 