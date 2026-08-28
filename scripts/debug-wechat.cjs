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
  const wx = accounts.find(a => a.name === '微信余额');
  console.log('微信余额账户:', wx.id, wx.kind);
  const recs = balances
    .filter(b => b.accountId === wx.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  console.log('微信余额全部记录:');
  recs.forEach(b => console.log(`  ${b.date} ¥${b.amount} ${b.note ? '(' + b.note + ')' : ''}`));

  // 2025-12-01 和 2026-01-01 的记录分布（看看哪些账户只有老记录）
  console.log('\n=== 各日期各账户记录条数 ===');
  const dates = [...new Set(balances.map(b => b.date))].sort();
  dates.forEach(d => {
    const inDate = balances.filter(b => b.date === d);
    const names = inDate.map(b => {
      const a = accounts.find(x => x.id === b.accountId);
      return a ? a.name : b.accountId;
    });
    console.log(`  ${d}: ${inDate.length} 条 [${names.join(', ')}]`);
  });
})();
