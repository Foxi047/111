импорт { DefineConfig } от 'быстро';
импорт реагировать от '@vitejs/plagin-react';
импорт { Вдоль } от 'Резюме-плугин-веса';

экспорт по умолчанию DefineConfig({
  база: '/text-editor-pwa/',
  плагины: [
    реагировать(),
    Вдоль({
      RegisterType: 'Autoupdate',
      Рабочая коробка: {
        Globpatterns: ['**/*. {JS, CSS, HTML, ICO, PNG, SVG}']
      },
      манифест: {
        имя: 'Текстовый редактор',
        short_name: 'Редактор',
        описание: 'Полнофункциональный текстовый редактор с поддержкой вкладок, таблиц и форматирования',
        theme_color: '#3b82f6',
        background_color: "#ffffff",
        отображать: 'автономный',
        ориентация: «Портрет-принцип»,
        объем: '/text-editor-pwa/',
        start_url: '/text-editor-pwa/',
        lang: 'ru',
        icons: [
          {
            src: '/text-editor-pwa/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/text-editor-pwa/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/text-editor-pwa/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/text-editor-pwa/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/text-editor-pwa/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/text-editor-pwa/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/text-editor-pwa/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/text-editor-pwa/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ],
        shortcuts: [
          {
            name: 'Создать новый документ',
            short_name: 'Новый',
            description: 'Создать новую вкладку для редактирования',
            url: '/text-editor-pwa/?action=new',
            icons: [{ src: '/text-editor-pwa/icons/icon-96x96.png', sizes: '96x96' }]
          }
        ],
        categories: ['productivity', 'utilities']
      }
    })
  ],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});