// Entry for the single-file build (dist/driffy.html): same App, no Next.js.
import { createRoot } from 'react-dom/client';
import App from '../components/App';

createRoot(document.getElementById('root')!).render(<App />);
