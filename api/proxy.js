const TARGET_HOST = 'inferaiapi.com';
const TARGET_PROTOCOL = 'https';

export default async function handler(req, res) {
  // 设置 CORS 头，允许网页端调用
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // 预检请求直接返回成功
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // 拼出要请求的真实 URL
  const targetUrl = `${TARGET_PROTOCOL}://${TARGET_HOST}${req.url}`;

  // 构建转发用的请求头
  const headers = { ...req.headers };
  delete headers.host;
  headers.host = TARGET_HOST;
  headers.connection = 'close';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text();

    // 返回响应给浏览器，带 CORS 头
    res.status(response.status);
    Object.keys(response.headers).forEach((key) => {
      try { res.setHeader(key, response.headers.get(key)); } catch (e) {}
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(responseBody);
  } catch (error) {
    console.error('代理错误:', error);
    res.status(502).json({ error: error.message });
  }
}
