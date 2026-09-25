const TARGET_HOST = 'inferaiapi.com';
const TARGET_PROTOCOL = 'https';

export default async function handler(req, res) {
  // 设置 CORS 头，允许网页端调用
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // 从 rewrite 传来的 query 参数里还原真实路径
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathParam = reqUrl.searchParams.get('path') || '';
  const actualPath = `/v1/${pathParam}`;
  const targetUrl = `${TARGET_PROTOCOL}://${TARGET_HOST}${actualPath}`;

  const headers = { ...req.headers };
  delete headers.host;
  headers.host = TARGET_HOST;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseBody = await response.text();

    res.status(response.status);
    response.headers.forEach((value, key) => {
      try { res.setHeader(key, value); } catch (e) {}
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(responseBody);
  } catch (error) {
    console.error('代理错误:', error);
    res.status(502).json({ error: error.message });
  }
}
