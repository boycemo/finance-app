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
  const before = JSON.parse((await req('GET', '/api/balances')).body);
  const accsBefore = JSON.parse((await req('GET', '/api/accounts')).body);
  const subsBefore = JSON.parse((await req('GET', '/api/sub-accounts')).body);
  console.log('before  balances:', before.length, 'accounts:', accsBefore.length, 'subs:', subsBefore.length);
  const r = await req('POST', '/api/clear-all', {});
  console.log('clear-all:', r.status, r.body);
  const after = JSON.parse((await req('GET', '/api/balances')).body);
  const accsAfter = JSON.parse((await req('GET', '/api/accounts')).body);
  const subsAfter = JSON.parse((await req('GET', '/api/sub-accounts')).body);
  console.log('after   balances:', after.length, 'accounts:', accsAfter.length, 'subs:', subsAfter.length);
  console.log('accounts kept:', accsAfter.length === accsBefore.length ? 'OK' : 'FAIL');
  console.log('subs kept:', subsAfter.length === subsBefore.length ? 'OK' : 'FAIL');
})();
