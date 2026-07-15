import type { Metadata, Viewport } from 'next';
import { APP_VERSION } from '@/lib/version';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: `Check ECF 4 v${APP_VERSION} — Monitoring`,
  description: 'Inspección técnica de camionetas en terreno',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  applicationName: 'Check ECF 4',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Check ECF 4',
  },
  icons: {
    icon: [
      { url: '/branding/logo-circular.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/branding/logo-circular.svg', type: 'image/svg+xml' }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1A418C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
