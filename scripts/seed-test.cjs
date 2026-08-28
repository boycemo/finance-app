const http = require('http');
function req(m, p, b) {
  return new Promise((resolve, reject) => {
    const data = b ? JSON.stringify(b) : null;
    const q = http.request(
      { host: '127.0.0.1', port: 3001, path: p, method: m, headers: { 'Content-Type': 'application/json' } },
      (s) => {
        let x = '';
        s.on('data', (c) => (x += c));
        s.on('end', () => resolve({ status: s.statusCode, body: x }));
      }
    );
    q.on('error', reject);
    if (data) q.write(data);
    q.end();
  });
}
(async () => {
  // 加 2 条测试余额 + 1 条记录
  await req('POST', '/api/balances', { accountId: 'a-alipay', amount: 1234, date: '2026-08-26' });
  await req('POST', '/api/balances', { accountId: 'a-jd', amount: 567, date: '2026-08-26' });
  await req('POST', '/api/records', {
    type: 'expense', amount: 30, category: 'c-food', date: '2026-08-26', note: '测试'
  });
  console.log('seed done');
})();
