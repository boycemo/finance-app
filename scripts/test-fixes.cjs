// 测试 5 个功能：编辑、按日期批量删除、批量按日期预填
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
  // 1) PUT 修改一条余额
  const before = JSON.parse((await req('GET', '/api/balances')).body);
  if (before.length === 0) {
    console.log('没有余额数据，跳过');
    return;
  }
  const target = before[0];
  console.log('编辑前:', target.id, target.amount);
  const upd = await req('PUT', '/api/balances/' + target.id, {
    amount: 12345.67,
    date: target.date,
    note: '测试编辑',
  });
  console.log('编辑后:', upd.status, upd.body);

  // 2) 按日期批量删除（用刚改的日期）
  const dateToDel = target.date;
  const byDate = await req('POST', '/api/balances/batch-delete-by-date', {
    dates: [dateToDel],
  });
  console.log('按日期删除:', byDate.status, byDate.body);
  const after = JSON.parse((await req('GET', '/api/balances')).body);
  console.log('剩余条数:', after.length, '(应减去 1)');

  // 3) 验证余额历史修改功能（编辑后查询）
  const upd2 = await req('PUT', '/api/balances/' + before[1].id, { amount: 999.99, date: before[1].date });
  console.log('编辑第 2 条:', upd2.status, upd2.body);
  // 清理
  await req('DELETE', '/api/balances/' + before[1].id);
  console.log('清理完成');
})();
