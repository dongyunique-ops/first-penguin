// build.js — Inject env vars into index.html before deploy
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const out = html
  .replace('__SUPABASE_URL__', process.env.SUPABASE_URL || '')
  .replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', out);
// Copy all referenced assets
['styles.css', 'shared.jsx', 'tweaks-panel.jsx', 'proto-helpers.jsx',
 'proto-video.jsx', 'proto-player.jsx',
 'supabase-client.jsx', 'auth-screen.jsx',
 'proto-contact-sheet-live.jsx', 'proto-player-live.jsx'].forEach(f => {
  if (fs.existsSync(f)) fs.copyFileSync(f, `dist/${f}`);
});
console.log('Built to dist/');
