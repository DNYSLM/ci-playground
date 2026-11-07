// Sits behind Plesk's nginx and sends each request to the right app process.
//   staging.<domain>          -> 127.0.0.1:4001
//   prod.<domain>             -> 127.0.0.1:4002
//   preview.<domain>/pr-<n>/  -> 127.0.0.1:(5000 + n), with /pr-<n> stripped
// Previews share one host (and one certificate) because a wildcard
// certificate would need DNS access that Plesk does not have here.
import http from 'node:http';
import { pathToFileURL } from 'node:url';

export const PORTS = { staging: 4001, prod: 4002 };
export const previewPort = (n) => 5000 + n;

export function route(host, url) {
  const label = String(host ?? '').split(':')[0].split('.')[0].toLowerCase();
  if (Object.hasOwn(PORTS, label)) return { port: PORTS[label], path: url };
  if (label !== 'preview') return null;

  const match = /^\/pr-(\d{1,3})(\/.*)?$/.exec(url);
  if (!match) return null;
  const prefix = `/pr-${match[1]}`;
  if (!match[2]) return { redirect: `${prefix}/` };
  return { port: previewPort(Number(match[1])), path: match[2], prefix };
}

// The app sets its session cookie on Path=/. Behind a preview prefix, scope
// it to that preview so two previews in one browser do not clash.
export function scopeCookie(cookie, prefix) {
  return cookie.replace(/;\s*Path=\/(?=;|$)/i, `; Path=${prefix}/`);
}

function text(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`${body}\n`);
}

export function createRouter() {
  return http.createServer((req, res) => {
    const target = route(req.headers.host, req.url);
    if (!target) return text(res, 404, 'No playground environment here.');
    if (target.redirect) {
      res.writeHead(302, { Location: target.redirect });
      return res.end();
    }

    const upstream = http.request(
      { host: '127.0.0.1', port: target.port, method: req.method, path: target.path, headers: req.headers },
      (up) => {
        const headers = { ...up.headers };
        if (target.prefix && headers['set-cookie']) {
          headers['set-cookie'] = headers['set-cookie'].map((c) => scopeCookie(c, target.prefix));
        }
        res.writeHead(up.statusCode, headers);
        up.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (res.headersSent) return res.end();
      text(res, 502, `Nothing is running for this environment (port ${target.port}).`);
    });
    req.pipe(upstream);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const port = Number(process.env.PORT ?? 4000);
  createRouter().listen(port, '127.0.0.1', () => console.log(`router on 127.0.0.1:${port}`));
}
