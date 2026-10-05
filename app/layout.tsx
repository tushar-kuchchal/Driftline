import type { Metadata, Viewport } from 'next';
import { RegisterSW } from '../components/RegisterSW';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '../lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Driffy', 'relaxing game', 'calm game', 'stress relief game', 'anxiety relief game',
    'mindfulness game', 'line drawing game', 'draw lines game', 'zen game', 'free browser game',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  category: 'games',
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B1026',
};

// Structured data so search engines know this page is a free, playable game.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': ['VideoGame', 'WebApplication'],
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  image: `${SITE_URL}/icon-512.png`,
  genre: ['Casual', 'Relaxation'],
  gamePlatform: ['Web browser', 'iOS', 'Android'],
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  playMode: 'SinglePlayer',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
