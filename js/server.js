const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const rootDirectory = __dirname;
const port = Number(process.env.PORT) || 3000;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendJson(request, response, statusCode, data) {
  response.writeHead(statusCode, {
    ...corsHeaders(request),
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(data));
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin) return {};

  if (origin === 'null') {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin'
    };
  }

  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname)) {
      return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        Vary: 'Origin'
      };
    }
  } catch {
    return {};
  }
  return {};
}

function isAllowedArticleUrl(url) {
  const hostname = url.hostname.toLowerCase();
  return url.protocol === 'https:' &&
    (hostname === 'dantri.com.vn' || hostname.endsWith('.dantri.com.vn'));
}

async function fetchArticleHtml(articleUrl) {
  let targetUrl = articleUrl;

  for (let redirectCount = 0; redirectCount <= 4; redirectCount += 1) {
    const upstream = await fetch(targetUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000)
    });

    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      const location = upstream.headers.get('location');
      if (!location || redirectCount === 4) {
        throw new Error('Trang nguồn chuyển hướng quá nhiều lần.');
      }

      targetUrl = new URL(location, targetUrl);
      if (!isAllowedArticleUrl(targetUrl)) {
        throw new Error('Trang nguồn chuyển hướng đến tên miền không được phép.');
      }
      continue;
    }

    if (!upstream.ok) {
      throw new Error(`Trang nguồn trả về HTTP ${upstream.status}.`);
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('URL không trả về trang HTML.');
    }

    const html = await upstream.text();
    if (!html.trim()) throw new Error('Trang nguồn trả về nội dung rỗng.');
    return html;
  }

  throw new Error('Không thể tải nội dung bài viết.');
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'OPTIONS' && requestUrl.pathname === '/api/fetch-article') {
    response.writeHead(204, { ...corsHeaders(request), 'Content-Length': '0' });
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    sendJson(request, response, 405, { error: 'Chỉ hỗ trợ GET.' });
    return;
  }

  if (requestUrl.pathname === '/api/fetch-article') {
    let articleUrl;
    try {
      articleUrl = new URL(requestUrl.searchParams.get('url') || '');
    } catch {
      sendJson(request, response, 400, { error: 'URL bài viết không hợp lệ.' });
      return;
    }

    if (!isAllowedArticleUrl(articleUrl)) {
      sendJson(request, response, 400, { error: 'Chỉ hỗ trợ URL HTTPS thuộc dantri.com.vn.' });
      return;
    }

    try {
      const html = await fetchArticleHtml(articleUrl);
      sendJson(request, response, 200, { html });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải bài viết.';
      sendJson(request, response, 502, { error: message });
    }
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400);
    response.end('Invalid path');
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(rootDirectory, relativePath);
  if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`News Today is running at http://127.0.0.1:${port}`);
});