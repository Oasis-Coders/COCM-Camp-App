import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Camp Management App',
    short_name: 'CampOps',
    description: 'Camp and event operations shell with auth, tasks, and check-in scaffolding.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fcfcf7',
    theme_color: '#0f3d2e',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  };
}
