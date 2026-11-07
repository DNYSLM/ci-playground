// To-Do Deck server: plain Node, no framework, data kept in memory.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createStore, ValidationError } from './src/todos.js';
import { parseSeedUsers } from './src/seed.js';

const PORT = Number(process.env.PORT ?? 3000);
const APP_ENV = process.env.APP_ENV ?? 'local';
const ENABLE_TEST_API = process.env.ENABLE_TEST_API === '1';
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? '';

if (!SEED_PASSWORD) {
  console.error(
    'SEED_PASSWORD is not set. Locally: copy .env.example to .env. ' +
      'In CI and on the VPS it comes from a secret.',
  );
  process.exit(1);
}
if (APP_ENV === 'production' && ENABLE_TEST_API) {
  console.error('Refusing to start: the test API must never be on in production.');
  process.exit(1);
}

const seedUsers = new Set(parseSeedUsers(process.env.SEED_USERS ?? 'tester1,tester2'));

// What is actually being served. Exercise 2 is built around this endpoint.
const build = Object.freeze({
  version: process.env.APP_VERSION ?? 'dev',
  commit: (process.env.GIT_SHA ?? 'local').slice(0, 7),
  env: APP_ENV,
  startedAt: new Date().toISOString(),
});

const store = createStore();
const sessions = new Map(); // token -> username

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
};

const digest = (s) => createHash('sha256').update(String(s)).digest();
const passwordMatches = (given) => timingSafeEqual(digest(given ?? ''), digest(SEED_PASSWORD));

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new ValidationError('Body too large');
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError('Body is not valid JSON');
  }
}

function sessionToken(req) {
  const match = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie ?? '');
  return match?.[1];
}

function cookie(req, value, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `sid=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const method = req.method;

  if (method === 'GET' && STATIC[pathname]) {
    const [file, type] = STATIC[pathname];
    const body = await readFile(new URL(`./public/${file}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    return res.end(body);
  }

  if (pathname === '/api/version' && method === 'GET') return json(res, 200, build);

  if (pathname === '/api/login' && method === 'POST') {
    const { username, password } = await readJson(req);
    const name = String(username ?? '').trim().toLowerCase();
    if (!seedUsers.has(name) || !passwordMatches(password)) {
      return json(res, 401, { error: 'Login failed' });
    }
    const token = randomBytes(32).toString('hex');
    sessions.set(token, name);
    return json(res, 200, { username: name }, { 'Set-Cookie': cookie(req, token, 86_400) });
  }

  if (pathname === '/api/logout' && method === 'POST') {
    sessions.delete(sessionToken(req));
    return json(res, 204, undefined, { 'Set-Cookie': cookie(req, '', 0) });
  }

  if (pathname === '/api/test/reset' && method === 'POST') {
    if (!ENABLE_TEST_API) return json(res, 404, { error: 'Not found' });
    store.reset();
    return json(res, 204);
  }

  const user = sessions.get(sessionToken(req));

  if (pathname === '/api/me' && method === 'GET') {
    return user ? json(res, 200, { username: user }) : json(res, 401, { error: 'Not logged in' });
  }

  if (pathname.startsWith('/api/todos') && !user) return json(res, 401, { error: 'Not logged in' });

  if (pathname === '/api/todos') {
    if (method === 'GET') return json(res, 200, store.list(user));
    if (method === 'POST') {
      const { title } = await readJson(req);
      return json(res, 201, store.add(user, title));
    }
  }

  const item = /^\/api\/todos\/(\d+)$/.exec(pathname);
  if (item) {
    const id = Number(item[1]);
    if (method === 'PATCH') {
      const updated = store.update(user, id, await readJson(req));
      return updated ? json(res, 200, updated) : json(res, 404, { error: 'No such to-do' });
    }
    if (method === 'DELETE') {
      return store.remove(user, id) ? json(res, 204) : json(res, 404, { error: 'No such to-do' });
    }
  }

  return json(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (err instanceof ValidationError) return json(res, 400, { error: err.message });
    console.error(err);
    return json(res, 500, { error: 'Internal error' });
  });
});

// HOST unset listens everywhere (fine for local and CI). On the VPS the
// deploy sets HOST=127.0.0.1 so only the router can reach the app.
server.listen(PORT, process.env.HOST, () => {
  console.log(`To-Do Deck ${build.version} (${build.commit}) env=${APP_ENV} on :${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
