'use client';
import dynamic from 'next/dynamic';

// The game reads saved settings from localStorage, so it renders on the client only.
const App = dynamic(() => import('../components/App'), { ssr: false });

export default function Page() {
  return <App />;
}
