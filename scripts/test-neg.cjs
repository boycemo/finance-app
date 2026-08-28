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
  const health = await req('GET', '/api/health');
  console.log('health:', health.status, health.body);

  // 1) 金额 = 0：现在应该能存
  const r0 = await req('POST', '/api/balances', { accountId: 'a-alipay', amount: 0, date: '2026-08-26' });
  console.log('amount=0:', r0.status, r0.body);

  // 2) 金额 = -500：能存为负
  const r1 = await req('POST', '/api/balances', { accountId: 'a-alipay', amount: -500, date: '2026-08-26' });
  console.log('amount=-500:', r1.status, r1.body);

  // 3) 批量（带负数）
  const r2 = await req('POST', '/api/balances/batch', {
    items: [
      { accountId: 'a-alipay', amount: -100, date: '2026-08-26', note: '负数批量' },
      { accountId: 'a-alipay', amount: 200, date: '2026-08-26', note: '正数批量' },
    ],
  });
  console.log('batch:', r2.status, r2.body);

  // 清理
  const all = JSON.parse((await req('GET', '/api/balances')).body);
  for (const b of all) {
    await req('DELETE', '/api/balances/' + b.id);
  }
  console.log('cleaned, remaining:', JSON.parse((await req('GET', '/api/balances')).body).length);
})();
