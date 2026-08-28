// 模拟 7 月初 + 7 月末两次录入，验证时间点趋势
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
  // 7 月初
  await req('POST', '/api/balances', { accountId: 'a-alipay', amount: 10000, date: '2026-07-05', note: '7月初' });
  // 7 月末
  await req('POST', '/api/balances', { accountId: 'a-alipay', amount: 11500, date: '2026-07-28', note: '7月末' });
  // 8 月初
  await req('POST', '/api/balances', { accountId: 'a-alipay', amount: 9000, date: '2026-08-03', note: '8月初' });
  // 8 月中
  await req('POST', '/api/balances', { accountId: 'a-alipay', amount: 9500, date: '2026-08-20', note: '8月中' });
  const all = JSON.parse((await req('GET', '/api/balances')).body);
  console.log('录入后余额条数:', all.length);
  console.log('日期:', all.map((b) => b.date).sort());
})();
