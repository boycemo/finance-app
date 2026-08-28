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

  // 2 月的数据
  const feb = balances.filter(b => b.date.startsWith('2026-02'));
  console.log('=== 2026-02 余额记录 ===');
  feb.forEach(b => {
    const acc = accounts.find(a => a.id === b.accountId);
    const sub = b.subAccountId ? subs.find(s => s.id === b.subAccountId) : null;
    console.log(
      `  ${b.date} | 账户: ${acc ? acc.name : b.accountId} | 小项目: ${sub ? sub.name : '(直录)'} | ¥${b.amount}`
    );
  });
  console.log('2月记录条数:', feb.length);

  // 所有账户 + 启用子账户
  console.log('\n=== 账户配置 ===');
  accounts.filter(a => !a.archived).forEach(a => {
    const enabled = subs.filter(s => s.accountId === a.id && s.enabled);
    console.log(`  ${a.name} (${a.id}) kind=${a.kind} 启用子账户: ${enabled.length > 0 ? enabled.map(s => s.name).join(', ') : '无'}`);
  });

  // 当前批量录入 allRows 会构造哪些行？
  console.log('\n=== 批量录入将显示的行 ===');
  accounts.filter(a => !a.archived).forEach(a => {
    const enabled = subs.filter(s => s.accountId === a.id && s.enabled);
    if (enabled.length > 0) {
      enabled.forEach(s => {
        // 该行在 2 月的匹配数据
        const m = balances.filter(b => b.subAccountId === s.id && b.date <= '2026-02-28');
        console.log(`  ${a.name} · ${s.name} -> 截至2月末记录: ${m.length} 条${m.length > 0 ? ' (最新 ¥' + m.sort((x,y)=>x.date<y.date?1:-1)[0].amount + ')' : ''}`);
      });
    } else {
      const m = balances.filter(b => b.accountId === a.id && !b.subAccountId && b.date <= '2026-02-28');
      console.log(`  ${a.name} (直录) -> 截至2月末记录: ${m.length} 条${m.length > 0 ? ' (最新 ¥' + m.sort((x,y)=>x.date<y.date?1:-1)[0].amount + ')' : ''}`);
    }
  });
})();
