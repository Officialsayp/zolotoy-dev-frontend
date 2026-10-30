// Port of the live Caddy routing contract. Nginx serves every static byte.
// Request URI matching is deliberately raw until the public-assets stage.
import fs from 'fs';

const CACHE = 'public, max-age=0, must-revalidate';
const PUBLIC = [
    '/', '/architecture/', '/services/order/', '/services/auth/',
    '/services/notification/', '/services/url-shortener/',
];

function file(root, path) {
    try { return fs.statSync(root + path).isFile(); } catch (_) { return false; }
}

function send(r, status, body) {
    r.status = status;
    if (body.length) {
        r.headersOut['Content-Type'] = 'text/plain; charset=utf-8';
        r.return(status, body);
        return;
    }
    r.headersOut['Content-Length'] = String(Buffer.byteLength(body));
    r.sendHeader();
    r.finish();
}

function redirect(r, status, target) {
    r.headersOut.Location = target;
    send(r, status, '');
}

// Match Go net/url's path escaping, including byte-preserving non-UTF8 paths.
// Unlike encodeURI, Go escapes ! ' ( ) * and preserves $ & + , / : ; = @.
function escapedPath(r) {
    const raw = r.rawVariables.request_uri;
    const bytes = [];
    for (let i = 0; i < raw.length && raw[i] !== 63; i++) {
        let n = raw[i];
        if (n === 37 && i + 2 < raw.length) {
            n = parseInt(String.fromCharCode(raw[i + 1], raw[i + 2]), 16);
            i += 2;
        }
        if (n === 47 && bytes.length && bytes[bytes.length - 1] === 47) continue;
        bytes.push(n);
    }
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
        const n = bytes[i];
        const c = String.fromCharCode(n);
        if ((n >= 48 && n <= 57) || (n >= 65 && n <= 90) ||
            (n >= 97 && n <= 122) || '-._~$&+,/:;=@'.indexOf(c) !== -1) out += c;
        else out += '%' + n.toString(16).toUpperCase().padStart(2, '0');
    }
    return out;
}

function dispatch(r) {
    const raw = r.variables.request_uri;
    const q = raw.indexOf('?');
    const path = q === -1 ? raw : raw.slice(0, q);
    const query = q === -1 ? '' : raw.slice(q);
    const staging = r.variables.host === 'origin.zolotoy.dev';
    const operational = path === '/_health' || path === '/_release';
    const root = r.variables.document_root;
    r.variables.zd_cache = operational && (!staging || r.method === 'GET' || r.method === 'HEAD') ? 'no-store' : '';
    r.variables.zd_robots = staging ? 'noindex,nofollow' : operational ? 'noindex' : '';

    if (r.method !== 'GET' && r.method !== 'HEAD') {
        send(r, 405, /^\/(demo|orders|auth|notifications|shortener)(\/|$)/.test(path) ? 'Method not allowed' : '');
        return;
    }
    if (path === '/_health') { send(r, 200, 'ok'); return; }
    if (!file(root, '/index.html')) {
        r.variables.zd_cache = 'no-store';
        if (!staging) r.variables.zd_robots = 'noindex';
        send(r, 503, 'Frontend deployment pending');
        return;
    }
    if (path === '/_release') {
        r.variables.zd_vary = 'Accept-Encoding';
        r.variables.zd_file = '/release-id.txt';
        r.internalRedirect('@zd_release');
        return;
    }

    const legacy = /^\/(orders|shortener)(\/+[^/]+)?\/*$/.test(path) ||
        /^\/auth(\/+(login|register|profile|sessions|admin))?\/*$/.test(path) ||
        /^\/notifications(\/+[^/]+|\/+events\/+[^/]+)?\/*$/.test(path);
    if (legacy) {
        let target;
        if (/^\/(orders|auth|notifications|shortener)\/?$/.test(path)) target = '/demo' + path.replace(/\/$/, '') + '/';
        else target = '/demo' + path.replace(/\/$/, '');
        redirect(r, 308, r.variables.scheme + '://' + r.variables.http_host + target + query);
        return;
    }
    if (path === '/demo' || path === '/demo/index.html') {
        redirect(r, 308, r.variables.scheme + '://' + r.variables.http_host + '/demo/' + query);
        return;
    }
    const demo = /^\/demo\/+$/.test(path) ||
        /^\/demo\/+(orders|shortener)(\/+[^/]+)?\/*$/.test(path) ||
        /^\/demo\/+auth(\/+(login|register|profile|sessions|admin))?\/*$/.test(path) ||
        /^\/demo\/+notifications(\/+[^/]+|\/+events\/+[^/]+)?\/*$/.test(path);
    if (demo) {
        r.variables.zd_vary = 'Accept-Encoding';
        r.variables.zd_cache = CACHE;
        if (!staging) r.variables.zd_robots = 'noindex,follow';
        r.variables.zd_file = '/demo/index.html';
        r.internalRedirect('@zd_demo_static');
        return;
    }
    if (path.indexOf('/demo/') === 0) {
        const actual = /^\/demo\/+(index\/?|index\.html)$/.test(r.uri) ? '/demo/index.html' : r.uri;
        if (!actual.endsWith('/') && file(root, actual)) {
            r.variables.zd_vary = 'Accept-Encoding';
            r.variables.zd_cache = CACHE;
            r.variables.zd_file = actual;
            r.internalRedirect('@zd_demo_static');
        } else {
            if (!staging) r.variables.zd_robots = 'noindex';
            send(r, 404, 'Not found');
        }
        return;
    }

    const normalized = r.uri;
    let alias = '';
    let match;
    if (/^\/(index|index\.html)$/.test(normalized)) alias = '/';
    else if ((match = normalized.match(/^\/(ru|(?:ru\/)?architecture|(?:ru\/)?services\/(?:order|auth|notification|url-shortener))(?:\.html|\/index(?:\.html)?)?$/))) alias = '/' + match[1] + '/';
    else if (normalized === '/demo.html') alias = '/demo/';
    else if ((match = normalized.match(/^\/((?:ru\/)?404)(?:\.html|\/|\/index(?:\.html)?)$/))) alias = '/' + match[1];
    else if ((match = normalized.match(/^\/(ru|(?:ru\/)?architecture|(?:ru\/)?services\/(?:order|auth|notification|url-shortener))\/index\/$/))) alias = '/' + match[1] + '/index';
    else if (normalized === '/index/') alias = '/index';
    if (alias) { redirect(r, 307, alias + query); return; }
    const escaped = escapedPath(r);
    if (path !== escaped) { redirect(r, 307, escaped + query); return; }

    const incoming = r.rawHeadersIn;
    const privateCache = incoming.some(h => h[0].toLowerCase() === 'authorization' || h[0].toLowerCase() === 'range');
    r.variables.zd_cache = privateCache ? '' : CACHE;
    r.variables.zd_vary = 'Accept-Encoding';
    let actual = normalized;
    if (PUBLIC.indexOf(normalized) !== -1 || PUBLIC.map(p => '/ru' + p).indexOf(normalized) !== -1) actual += 'index.html';
    else if (normalized === '/404' || normalized === '/ru/404') actual += '.html';
    if (!actual.endsWith('/') && file(root, actual)) {
        r.variables.zd_file = actual;
        r.internalRedirect(actual === '/sitemap.xml' ? '@zd_sitemap' : '@zd_static');
    } else {
        r.variables.zd_file = normalized === '/ru' || normalized.indexOf('/ru/') === 0 ? '/ru/404.html' : '/404.html';
        r.internalRedirect('@zd_notfound');
    }
}

function assetError(r) {
    r.variables.zd_vary = '';
    r.variables.zd_cache = 'no-store';
    r.variables.zd_robots = r.variables.host === 'origin.zolotoy.dev' ? 'noindex,nofollow' : 'noindex';
    send(r, 404, 'Production asset unavailable');
}

function headers(r) {
    if (r.status === 416) r.headersOut['X-Content-Type-Options'] = 'nosniff';
    const pairs = [['Cache-Control', 'zd_cache'], ['X-Robots-Tag', 'zd_robots'], ['Vary', 'zd_vary']];
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const value = pair[0] === 'Cache-Control' && r.status === 416 ? '' : r.variables[pair[1]];
        if (value) r.headersOut[pair[0]] = value;
        else delete r.headersOut[pair[0]];
    }
}

export default { dispatch, assetError, headers };
