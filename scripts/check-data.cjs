const http = require('http');
function req(m, p) {
  return new Promise((r, j) => {
    const q = http.request({ host: '127.0.0.1', port: 3001, path: p, method: m }, s => {
      let x = '';
      s.on('data', c => (x += c));
      s.on('end', () => r(JSON.parse(x)));
    });
    q.on('error', j);
    q.end();
  });
}
(async () => {
  const [accounts, balances] = await Promise.all([req('GET', '/api/accounts'), req('GET', '/api/balances')]);
  console.log('账户数:', accounts.length);
  console.log('余额记录数:', balances.length);
  const byDate = {};
  balances.forEach(b => { byDate[b.date] = (byDate[b.date] || 0) + 1; });
  console.log('各日期记录数:');
  Object.keys(byDate).sort().forEach(d => console.log(`  ${d}: ${byDate[d]} 条`));
  const byAccount = {};
  balances.forEach(b => {
    const a = accounts.find(x => x.id === b.accountId);
    const name = a ? a.name : b.accountId;
    byAccount[name] = (byAccount[name] || 0) + 1;
  });
  console.log('各账户记录数:');
  Object.keys(byAccount).forEach(n => console.log(`  ${n}: ${byAccount[n]} 条`));
})();
