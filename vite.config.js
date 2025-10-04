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
        enabled: true,
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