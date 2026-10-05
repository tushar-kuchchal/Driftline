// Bundles the game into one self-contained HTML file: dist/driffy.html
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const result = await build({
  entryPoints: ['standalone/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile('app/globals.css', 'utf8');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B1026">
<title>Driffy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap">
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`;

await mkdir('dist', { recursive: true });
await writeFile('dist/driffy.html', html);
console.log(`dist/driffy.html (${(html.length / 1024).toFixed(0)} kB)`);
