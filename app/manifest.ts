import type { MetadataRoute } from 'next'

// Сайтты телефонға / ноутбукқа қосымша ретінде орнату (PWA)
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Beles education',
    short_name: 'Beles',
    description: 'Білім тексеру сынағы, ҰБТ, IELTS, TOEFL сынақтары және оқушы кабинеті',
    lang: 'kk',
    start_url: '/login?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F7FB',
    theme_color: '#FFFFFF',
    categories: ['education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Білім тексеру', url: '/bilim-test', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'ҰБТ сынағы', url: '/ubt', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'IELTS mock', url: '/ielts', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
