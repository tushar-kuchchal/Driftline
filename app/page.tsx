'use client';
import dynamic from 'next/dynamic';

// The game reads saved settings from localStorage, so it renders on the client only.
// The loading screen is server-rendered, so it doubles as the crawlable text search engines index.
const App = dynamic(() => import('../components/App'), { ssr: false, loading: () => <Intro /> });

function Intro() {
  return (
    <main className="app">
      <section className="screen">
        <div className="home-head">
          <p className="kicker">A calm little game</p>
          <h1 className="title">Driffy</h1>
          <p className="lede">Draw a line. Watch it ride.</p>
          <p className="lede small">
            Draw glowing lines and watch a ball of light ride them. No score, no timer, no game over.
            A free, relaxing game for quieting a busy mind, playable in your browser on phone or desktop, even offline.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  return <App />;
}
