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

  // ===== 趋势图口径（截至某日期的最近快照，含当日） =====
  function balanceOnDate(acc, date) {
    const enabled = subs.filter(s => s.accountId === acc.id && s.enabled);
    if (enabled.length > 0) {
      return enabled.reduce((sum, s) => {
        const latest = balances.filter(b => b.subAccountId === s.id && b.date <= date).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)[0];
        return sum + (latest ? latest.amount : 0);
      }, 0);
    }
    const direct = balances.filter(b => b.accountId === acc.id && !b.subAccountId && b.date <= date).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)[0];
    return direct ? direct.amount : 0;
  }

  // ===== 月度报表口径（当月内最近快照，无记录=0） =====
  function balanceInMonth(acc, month) {
    const enabled = subs.filter(s => s.accountId === acc.id && s.enabled);
    if (enabled.length > 0) {
      return enabled.reduce((sum, s) => {
        const latest = balances.filter(b => b.subAccountId === s.id && b.date.startsWith(month)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)[0];
        return sum + (latest ? latest.amount : 0);
      }, 0);
    }
    const direct = balances.filter(b => b.accountId === acc.id && !b.subAccountId && b.date.startsWith(month)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)[0];
    return direct ? direct.amount : 0;
  }

  // 每个有记录的日期
  const dates = [...new Set(balances.map(b => b.date))].sort();

  console.log('=== 各日期趋势合计（截至当日） vs 当月报表合计 ===');
  dates.forEach(d => {
    const month = d.slice(0, 7);
    const trendTotal = active.reduce((s, a) => s + balanceOnDate(a, d), 0);
    const monthTotal = active.reduce((s, a) => s + balanceInMonth(a, month), 0);
    console.log(`${d} | 趋势: ${trendTotal} | 该月报表: ${monthTotal} | ${trendTotal === monthTotal ? '一致' : '不一致'}`);
  });

  // 明细：找一个不一致的点展示
  console.log('\n=== 明细对比（按账户） ===');
  const d = dates[dates.length - 1]; // 最新日期
  const month = d.slice(0, 7);
  console.log(`最新日期 ${d}（月 ${month}）`);
  active.forEach(a => {
    const t = balanceOnDate(a, d);
    const m = balanceInMonth(a, month);
    if (t !== m) {
      console.log(`  ${a.name}: 趋势(截至当日) ¥${t} | 月度报表(当月) ¥${m}  ← 不一致`);
    }
  });
})();
