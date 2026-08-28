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
  const [accounts, subs, balances] = await Promise.all([
    req('GET', '/api/accounts'),
    req('GET', '/api/sub-accounts'),
    req('GET', '/api/balances'),
  ]);
  const active = accounts.filter(a => !a.archived);

  // 当天口径（新趋势图）
  function balanceOnDay(acc, date) {
    const enabled = subs.filter(s => s.accountId === acc.id && s.enabled);
    if (enabled.length > 0) {
      return enabled.reduce((sum, s) => {
        const latest = balances.filter(b => b.subAccountId === s.id && b.date === date).sort((a, b) => a.date < b.date ? 1 : -1)[0];
        return sum + (latest ? latest.amount : 0);
      }, 0);
    }
    const direct = balances.filter(b => b.accountId === acc.id && !b.subAccountId && b.date === date).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    return direct ? direct.amount : 0;
  }

  // 月度口径（报表）
  function balanceInMonth(acc, month) {
    const enabled = subs.filter(s => s.accountId === acc.id && s.enabled);
    if (enabled.length > 0) {
      return enabled.reduce((sum, s) => {
        const latest = balances.filter(b => b.subAccountId === s.id && b.date.startsWith(month)).sort((a, b) => a.date < b.date ? 1 : -1)[0];
        return sum + (latest ? latest.amount : 0);
      }, 0);
    }
    const direct = balances.filter(b => b.accountId === acc.id && !b.subAccountId && b.date.startsWith(month)).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    return direct ? direct.amount : 0;
  }

  const dates = [...new Set(balances.map(b => b.date))].sort();
  console.log('=== 趋势（当天口径） vs 月度报表 ===');
  let allMatch = true;
  dates.forEach(d => {
    const month = d.slice(0, 7);
    const trendTotal = active.reduce((s, a) => s + balanceOnDay(a, d), 0);
    const monthTotal = active.reduce((s, a) => s + balanceInMonth(a, month), 0);
    const match = trendTotal === monthTotal;
    if (!match) allMatch = false;
    console.log(`${d} | 趋势: ${trendTotal} | ${month} 报表: ${monthTotal} | ${match ? '✓' : '✗'}`);
  });
  console.log(allMatch ? '\n✅ 所有日期趋势与月度报表完全一致' : '\n⚠️ 仍有不一致（无记录月份为 0 的口径差异）');
})();
