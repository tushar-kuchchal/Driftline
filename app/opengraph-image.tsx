import { ImageResponse } from 'next/og';

// Social preview card (link shares on WhatsApp, X, Slack, iMessage, etc.).
export const alt = 'Driffy – draw a line, watch it ride';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const RIDE = 'M -20 470 C 220 360, 420 600, 640 470 S 980 340, 1220 420';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 96px', background: 'linear-gradient(180deg, #0B1026 0%, #1B1F4B 100%)', color: '#F4F1FF',
          position: 'relative',
        }}
      >
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs>
            <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3DDCC8" />
              <stop offset="0.5" stopColor="#9B7BFF" />
              <stop offset="1" stopColor="#FF8A80" />
            </linearGradient>
          </defs>
          <path d={RIDE} fill="none" stroke="url(#ln)" strokeWidth="40" strokeLinecap="round" opacity="0.25" />
          <path d={RIDE} fill="none" stroke="url(#ln)" strokeWidth="10" strokeLinecap="round" />
          <circle cx="760" cy="420" r="44" fill="#FFF6E0" opacity="0.25" />
          <circle cx="760" cy="420" r="20" fill="#FFF6E0" />
        </svg>
        <div style={{ fontSize: 32, color: '#A9A3CC', marginTop: -160 }}>A calm little game</div>
        <div style={{ fontSize: 140, fontWeight: 600, lineHeight: 1.05 }}>Driffy</div>
        <div style={{ fontSize: 40, color: '#C9C3E8' }}>Draw a line. Watch it ride.</div>
      </div>
    ),
    size,
  );
}
