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

  // 模拟 fillFromLast：选 2026-03-15 -> 上月 2026-02
  const selected = '2026-03-15';
  const prevMonth = '2026-02';
  const prevEnd = '2026-02-28';
  let filled = 0;
  const result = [];

  accounts.filter(a => !a.archived).forEach(a => {
    const enabled = subs.filter(s => s.accountId === a.id && s.enabled);
    const targets = enabled.length > 0
      ? enabled.map(s => ({ accountId: a.id, subAccountId: s.id, label: `${a.name}·${s.name}` }))
      : [{ accountId: a.id, subAccountId: undefined, label: a.name }];

    targets.forEach(t => {
      const last = balances
        .filter(b => b.accountId === t.accountId && (b.subAccountId ?? null) === (t.subAccountId ?? null) && b.date <= prevEnd)
        .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : y.createdAt - x.createdAt))[0];
      if (last) {
        result.push(`${t.label} <- ¥${Math.abs(last.amount)} (${last.date})`);
        filled++;
      }
    });
  });

  console.log(`选 ${selected}，参照上月 ${prevMonth}:`);
  result.forEach(x => console.log('  ' + x));
  console.log('\n共填充:', filled, '条');
  console.log(filled > 0 ? '✓ 不再误报"没有可参照数据"' : '✗ 仍有问题');
})();
