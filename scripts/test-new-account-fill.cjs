// 测试：新增账户后自动补历史 0 记录（模拟 handleCreateAccount 逻辑）
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
  // 1) 建临时账户
  const created = JSON.parse((await req('POST', '/api/accounts', { name: '测试账户_补0', kind: 'cash', icon: '💰', color: '#10b981' })).body);
  console.log('创建账户:', created.id, created.name);

  // 2) 计算历史月份（模拟 allMonthsFromRecords：最早记录 2025-04 → 当前 2026-08）
  const all = JSON.parse((await req('GET', '/api/balances')).body);
  const dates = all.map(b => b.date).sort();
  const start = dates[0].slice(0, 7);
  const end = '2026-08';
  const months = [];
  let y = parseInt(start.slice(0, 4)), m = parseInt(start.slice(5, 7));
  const ey = parseInt(end.slice(0, 4)), em = parseInt(end.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  console.log('应补月份数:', months.length, '从', months[0], '到', months[months.length - 1]);

  // 3) 补 0 记录
  const items = months.map(mm => {
    const lastDay = new Date(y === ey && m - 1 === em ? 26 : 28, 0, 0); // 简化：用每月 28 号
    return { accountId: created.id, amount: 0, date: `${mm}-28`, note: '新增账户补录' };
  });
  // 当前月用今天 8/26
  items[items.length - 1].date = '2026-08-26';
  const r = await req('POST', '/api/balances/batch', { items });
  console.log('补 0 批量:', r.status, r.body);

  // 4) 验证
  const after = JSON.parse((await req('GET', '/api/balances')).body);
  const mine = after.filter(b => b.accountId === created.id);
  console.log('新账户记录数:', mine.length, '（应为', months.length, '条）');
  console.log('金额全 0:', mine.every(b => b.amount === 0) ? '✓' : '✗');

  // 清理
  await req('DELETE', '/api/accounts/' + created.id);
  console.log('清理完成');
})();
