import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flow Lines',
    short_name: 'Flow Lines',
    description: 'Draw a line. Watch it ride.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B1026',
    theme_color: '#0B1026',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
