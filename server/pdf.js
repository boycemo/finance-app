import PDFDocument from 'pdfkit'
import dayjs from 'dayjs'
import { getDb } from './db.js'

// 金额格式化（不含 ¥ 符号）
const fmt = (n) =>
  Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 带负号的金额格式
const fmtSigned = (n) => (n < 0 ? '-' : '') + fmt(Math.abs(n))

// 整数格式（不带 .00），让长数字在 PDF 表格里能完整显示
const fmtIntSigned = (n) =>
  (n < 0 ? '-' : '') +
  Number(Math.abs(n)).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

// 月份标签：2025-08 -> 2025年8月
const monthLabel = (m) => {
  const [y, mm] = m.split('-')
  return `${y}年${parseInt(mm, 10)}月`
}

// 上一个月份字符串
const prevMonth = (m) => dayjs(`${m}-01`).subtract(1, 'month').format('YYYY-MM')

// ============ 余额聚合（当月口径，无记录 = 0） ============
// 复刻前端 utils/assets.ts 的逻辑，保证 PDF 数字与页面表格一致
function accountMonthlyBalance(account, balances, subAccounts, month) {
  const monthStart = dayjs(`${month}-01`).format('YYYY-MM-DD')
  const monthEnd = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD')

  const latestInRange = (filter) => {
    const snaps = balances
      .filter((b) => filter(b) && b.date >= monthStart && b.date <= monthEnd)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
    return snaps[0] ? snaps[0].amount : 0
  }

  const enabledSubs = subAccounts
    .filter((s) => s.accountId === account.id && s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (enabledSubs.length > 0) {
    return enabledSubs.reduce((sum, s) => sum + latestInRange((b) => b.subAccountId === s.id), 0)
  }
  return latestInRange((b) => b.accountId === account.id && !b.subAccountId)
}

// ============ 主函数：渲染单月账户余额报表 PDF ============
// month 必传：YYYY-MM，PDF 只包含该月
export async function renderMonthlyPDF(month, res) {
  const db = getDb()

  // 查询所有非归档账户
  const accounts = db
    .prepare(
      'SELECT id, name, kind, icon, color, note FROM accounts WHERE archived = 0 ORDER BY sort_order, created_at',
    )
    .all()
  const subAccounts = db
    .prepare(
      'SELECT id, account_id as accountId, name, icon, color, note, enabled, sort_order as sortOrder, created_at as createdAt FROM sub_accounts ORDER BY account_id, sort_order, created_at',
    )
    .all()
  const balances = db
    .prepare(
      'SELECT id, account_id as accountId, sub_account_id as subAccountId, amount, date, note, created_at as createdAt FROM balance_snapshots',
    )
    .all()
    .map((b) => ({ ...b, amount: b.amount / 100 }))

  // 当月余额
  const currentValues = {}
  let currentTotal = 0
  for (const acc of accounts) {
    const v = accountMonthlyBalance(acc, balances, subAccounts, month)
    currentValues[acc.id] = v
    currentTotal += v
  }

  // 上月余额（用于环比）
  const pm = prevMonth(month)
  const prevValues = {}
  let prevTotal = 0
  for (const acc of accounts) {
    const v = accountMonthlyBalance(acc, balances, subAccounts, pm)
    prevValues[acc.id] = v
    prevTotal += v
  }

  // 创建 PDF（A4 横向 —— 4 列（账户/类型/本月/变化）需要更宽）
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 40, bottom: 40, left: 30, right: 30 },
    info: {
      Title: `账户余额月度报表 - ${monthLabel(month)}`,
      Author: '个人记账',
    },
  })

  // 注册 Windows 中文字体
  try {
    doc.registerFont('zh', 'C:/Windows/Fonts/msyh.ttc', 'MicrosoftYaHei')
  } catch {
    try {
      doc.registerFont('zh', 'C:/Windows/Fonts/simhei.ttf')
    } catch {
      doc.font('Helvetica')
    }
  }
  doc.font('zh')

  // ============ 标题区 ============
  doc.fillColor('#0f172a').fontSize(22).text('个人记账 · 账户余额月度报表', { align: 'center' })
  doc.moveDown(0.3)
  doc.fillColor('#475569').fontSize(16).text(monthLabel(month), { align: 'center' })
  doc.moveDown(0.2)
  doc.fillColor('#94a3b8').fontSize(9).text(`生成时间：${dayjs().format('YYYY-MM-DD HH:mm')}`, { align: 'center' })
  doc.moveDown(1.0)

  // ============ 总览（两张卡：总余额 + 环比） ============
  const summaryY = doc.y
  // 两张卡平分页面宽度（A4 纵向 595，左右各 30 边距，中间 25 间隔）
  const summaryW = (595 - 60 - 25) / 2
  const summaryH = 80

  const drawSummaryWithSub = (x, label, value, subText, valueColor, subColor) => {
    doc
      .roundedRect(x, summaryY, summaryW, summaryH, 8)
      .lineWidth(0.5)
      .strokeColor('#e2e8f0')
      .fillAndStroke('#f8fafc', '#e2e8f0')
    doc.fillColor('#64748b').fontSize(11)
    doc.text(label, x + 14, summaryY + 12, { width: summaryW - 28, align: 'center', lineBreak: false })
    doc.fillColor(valueColor).fontSize(22)
    doc.text(value, x + 14, summaryY + 32, { width: summaryW - 28, align: 'center', lineBreak: false })
    if (subText) {
      doc.fillColor(subColor).fontSize(10)
      doc.text(subText, x + 14, summaryY + 60, { width: summaryW - 28, align: 'center', lineBreak: false })
    }
    doc.y = summaryY
  }

  // 第一张：总余额（subValue 显示上月数字）
  const prevSubText = `上月 ${parseInt(pm.split('-')[1], 10)}月  ${fmtSigned(prevTotal)}`
  // 第二张：环比（subValue 显示百分比）
  const diff = currentTotal - prevTotal
  const diffPct = prevTotal === 0 ? null : (diff / Math.abs(prevTotal)) * 100
  const diffPctText =
    diffPct === null
      ? '— 较上月'
      : (diff > 0 ? '↑ +' : diff < 0 ? '↓ ' : '') + diffPct.toFixed(1) + '% 较上月'
  const diffColor = diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#64748b'

  drawSummaryWithSub(
    30,
    '本月总余额',
    fmtSigned(currentTotal),
    prevSubText,
    currentTotal >= 0 ? '#059669' : '#dc2626',
    '#64748b',
  )
  drawSummaryWithSub(
    30 + summaryW + 25,
    '环比变化',
    (diff >= 0 ? '+' : '') + fmtSigned(diff),
    diffPctText,
    diffColor,
    diffColor,
  )
  doc.y = summaryY + summaryH + 24

  // ============ 账户明细表（手画，完全可控） ============
  doc.fillColor('#0f172a').fontSize(13).text('各账户余额明细', { align: 'left' })
  doc.moveDown(0.4)

  // 列定义：[x起点, 列宽, 对齐, 表头文字]
  const prevMonthNum = parseInt(pm.split('-')[1], 10)
  const curMonthNum = parseInt(month.split('-')[1], 10)
  const tableLeft = 30
  const tableRight = doc.page.width - 30
  const totalW = tableRight - tableLeft
  // 4 列：A4 横向 842pt 宽，左右各 30pt 边距，可用 782pt
  // 账户(24%) 类型(13%) 本月(28%) 变化(35%) —— 与前端 HTML 预览一致
  const cols = [
    { x: tableLeft, w: totalW * 0.24, align: 'left', header: '账户' },
    { x: tableLeft + totalW * 0.24, w: totalW * 0.13, align: 'left', header: '类型' },
    { x: tableLeft + totalW * 0.37, w: totalW * 0.28, align: 'right', header: '本月' + curMonthNum + '月' },
    { x: tableLeft + totalW * 0.65, w: totalW * 0.35, align: 'right', header: '变化' },
  ]
  const rowH = 20
  const headerH = 22

  // 表头背景
  let curY = doc.y
  doc.save().rect(tableLeft, curY, totalW, headerH).fill('#0f172a').restore()
  // 表头文字
  doc.fillColor('#f8fafc').fontSize(8)
  for (const col of cols) {
    const tx = col.align === 'right' ? col.x + col.w - 8 : col.x + 8
    doc.text(col.header, tx, curY + 6, { lineBreak: false })
  }
  curY += headerH

  // 数据行
  doc.fontSize(8)
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i]
    const cur = currentValues[acc.id] ?? 0
    const prev = prevValues[acc.id] ?? 0
    const d = cur - prev

    // 奇数行加底色（斑马纹）
    if (i % 2 === 0) {
      doc.save().rect(tableLeft, curY, totalW, rowH).fill('#f8fafc').restore()
    }

    // 内容（4 列：账户/类型/本月/变化；上月数字已移到汇总卡 subValue）
    const cells = [
      { text: acc.icon + ' ' + acc.name, color: '#0f172a' },
      { text: kindLabel(acc.kind), color: '#475569' },
      { text: fmtIntSigned(cur), color: cur < 0 ? '#dc2626' : '#0f172a' },
      {
        text: d === 0 ? '—' : (d > 0 ? '+' : '') + fmtIntSigned(d),
        color: d > 0 ? '#059669' : d < 0 ? '#dc2626' : '#748b',
      },
    ]
    // 调试：每个 cell 都画一个可见的方括号前缀，确认是否真的渲染了
    if (i === 0 && false) {
      console.log('[pdf-debug] cells.length=', cells.length, 'cols.length=', cols.length)
    }
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j]
      const cell = cells[j]
      const tx = col.align === 'right' ? col.x + col.w - 8 : col.x + 8
      // 不传 width 选项，避免 pdfkit 内部 bug 丢内容
      doc.fillColor(cell.color).text(cell.text, tx, curY + 6, { lineBreak: false })
    }
    curY += rowH

    // 翻页处理（如果超出当前页）
    if (curY + rowH > doc.page.height - 60) {
      // 底部画分隔线
      doc.moveTo(tableLeft, curY).lineTo(tableRight, curY).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
      doc.addPage()
      curY = 50
    }
  }

  // 表格底部画分隔线
  doc.moveTo(tableLeft, curY).lineTo(tableRight, curY).strokeColor('#0f172a').lineWidth(0.8).stroke()
  doc.y = curY + 6

  // ============ 合计行（粗体强调） ============
  doc
    .lineWidth(0.5)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .strokeColor('#0f172a')
    .stroke()
  doc.moveDown(0.4)
  doc.fillColor('#0f172a').fontSize(12)
  doc.text('本月合计', 50, doc.y, { continued: true })
  doc.fillColor(currentTotal >= 0 ? '#059669' : '#dc2626').text(`  ${fmtSigned(currentTotal)}`, { align: 'right' })
  doc.text(`  ${diff > 0 ? '+' : ''}${fmtIntSigned(diff)} 较上月`, { align: 'right' })

  // ============ 页脚 ============
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        `第 ${i - range.start + 1} / ${range.count} 页 · 个人记账 · 账户余额月度报表 · ${monthLabel(month)}`,
        50,
        doc.page.height - 30,
        { width: doc.page.width - 100, align: 'center' },
      )
  }

  // 写入响应
  doc.pipe(res)
  doc.end()
}

// 账户类型中文标签
function kindLabel(k) {
  const map = {
    cash: '货币资金',
    investment: '投资账户',
    fund: '基金理财',
    credit: '信用账户',
    receivable: '应收',
    payable: '应付',
    other: '其他',
  }
  return map[k] ?? k
}
