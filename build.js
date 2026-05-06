// build.js — Inject env vars into index.html before deploy
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');
const out = html
  .replace('__SUPABASE_URL__', process.env.SUPABASE_URL || '')
  .replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '');

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', out);

// Copy ALL .jsx, .css, and other static assets at the project root
const STATIC_EXTS = ['.jsx', '.js', '.css', '.html', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.gif', '.webp'];
const SKIP_FILES = new Set(['build.js', 'index.html', 'package.json', 'vercel.json', '.env.example']);

fs.readdirSync('.').forEach(f => {
  if (SKIP_FILES.has(f)) return;
  const stat = fs.statSync(f);
  if (!stat.isFile()) return;
  const ext = path.extname(f).toLowerCase();
  if (!STATIC_EXTS.includes(ext)) return;
  fs.copyFileSync(f, `dist/${f}`);
  console.log(`  copied ${f}`);
});

console.log('Built to dist/');
