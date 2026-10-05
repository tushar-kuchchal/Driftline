import type { Metadata, Viewport } from 'next';
import { RegisterSW } from '../components/RegisterSW';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flow Lines',
  description: 'A calm little game: draw a line and watch a ball of light ride it.',
  applicationName: 'Flow Lines',
  appleWebApp: { capable: true, title: 'Flow Lines', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B1026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap" />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
