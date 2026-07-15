import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Check ECF 4',
    short_name: 'Check ECF 4',
    description: 'Inspección técnica de camionetas en terreno',
    start_url: '/check',
    display: 'standalone',
    background_color: '#F4F7FA',
    theme_color: '#1A418C',
    orientation: 'portrait',
    lang: 'es-CL',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: '/branding/logo-circular.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/branding/logo-circular.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/branding/logo-circular.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Nuevo checklist',
        short_name: 'Nuevo',
        url: '/check',
      },
      {
        name: 'Continuar inspección',
        short_name: 'Inspección',
        url: '/check/inspeccion',
      },
    ],
  };
}
