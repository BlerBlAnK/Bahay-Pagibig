/**
 * Writes the deployed API URL into environment.prod.ts before the build.
 *
 * Angular bakes the environment file into the bundle at compile time, so the
 * API URL cannot be read from an environment variable at runtime. Rather than
 * ask anyone to edit source before every deploy, Vercel's API_URL setting is
 * stamped in here as part of `npm run build:vercel`.
 *
 * With no API_URL set, the file is left exactly as it is, so a local
 * `ng build` keeps whatever is already committed.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
const raw = (process.env.API_URL || '').trim();

if (!raw) {
  console.log('[set-api-url] API_URL is not set — leaving environment.prod.ts unchanged.');
  process.exit(0);
}

// Accept the bare host or the full path; always end up with exactly one /api.
let url = raw.replace(/\/+$/, '');
if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
if (!/\/api$/i.test(url)) url += '/api';

const contents = `export const environment = {
  production: true,
  // Written at build time from the API_URL environment variable.
  apiUrl: '${url}',
};
`;

fs.writeFileSync(target, contents, 'utf8');
console.log('[set-api-url] apiUrl =', url);
