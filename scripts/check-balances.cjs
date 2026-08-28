const http = require('http');
function req(m, p, b) {
  return new Promise((r, j) => {
    const d = b ? JSON.stringify(b) : null;
    const q = http.request({ host: '127.0.0.1', port: 3001, path: p, method: m, headers: { 'Content-Type': 'application/json' } }, s => {
      let x = '';
      s.on('data', c => (x += c));
      s.on('end', () => r({ status: s.statusCode, body: x }));
    });
    q.on('error', j);
    if (d) q.write(d);
    q.end();
  });
}
(async () => {
  const all = JSON.parse((await req('GET', '/api/balances')).body);
  const today = all.filter(b => b.date === '2026-08-26');
  console.log('总余额条数:', all.length);
  console.log('8/26 当前剩余条数:', today.length);
  console.log('所有日期:', [...new Set(all.map(b => b.date))].sort());
  console.log('8/26 详情:');
  today.forEach(b => console.log(' ', b.accountId, '¥' + b.amount, b.note ? '(' + b.note + ')' : ''));
})();
