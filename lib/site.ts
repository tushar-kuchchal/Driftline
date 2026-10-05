// Public site details used for SEO metadata, the sitemap and social cards.
// Set NEXT_PUBLIC_SITE_URL to the live domain (e.g. https://driftline-indol.vercel.app) in your hosting env.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://driftline-indol.vercel.app').replace(/\/$/, '');
export const SITE_NAME = 'Driffy';
export const SITE_TITLE = 'Driffy – A Calm, Relaxing Line-Drawing Game';
export const SITE_DESCRIPTION =
  'Driffy is a free, calm browser game: draw glowing lines and watch a ball of light ride them. No score, no timer, no game over. Play online or offline on phone and desktop.';
