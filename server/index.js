import express from 'express'
import dayjs from 'dayjs'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, getDb, resetRecordsAndBalances } from './db.js'
import { renderMonthlyPDF } from './pdf.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT) || 3001
// 数据库文件位置：可通过环境变量覆盖，默认在 server 目录的 finance.db
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'finance.db')

const db = initDb(DB_PATH)
console.log(`[finance-api] sqlite ready: ${DB_PATH}`)

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// ============ 分类 ============
app.get('/api/categories', (req, res) => {
  const rows = getDb().prepare('SELECT id, name, type, icon, color FROM categories ORDER BY type, id').all()
  res.json(rows)
})

// ============ 记录 ============
// GET /api/records            → 全量（倒序）
// GET /api/records?month=YYYY-MM → 只返回该月记录（增量加载用）
// GET /api/records?limit=N    → 只返回最近 N 条
app.get('/api/records', (req, res) => {
  const { month, limit } = req.query || {}
  let sql = 'SELECT id, type, amount, category, date, note, created_at as createdAt FROM records'
  const where = []
  const params = []
  if (month && /^\d{4}-\d{2}$/.test(String(month))) {
    where.push("date LIKE ?")
    params.push(`${month}-%`)
  }
  if (where.length > 0) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY date DESC, created_at DESC'
  const n = Number(limit)
  if (Number.isInteger(n) && n > 0) sql += ` LIMIT ${n}`
  const rows = getDb().prepare(sql).all(...params)
  // 金额从分转回元
  const result = rows.map((r) => ({ ...r, amount: r.amount / 100 }))
  res.json(result)
})

app.post('/api/records', (req, res) => {
  const { type, amount, category, date, note } = req.body || {}
  if (!type || (type !== 'income' && type !== 'expense')) {
    return res.status(400).json({ error: 'invalid type' })
  }
  const num = Number(amount)
  if (!Number.isFinite(num)) {
    return res.status(400).json({ error: 'invalid amount' })
  }
  if (!category || !date) {
    return res.status(400).json({ error: 'category and date required' })
  }
  const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const amountCents = Math.round(num * 100)
  getDb()
    .prepare('INSERT INTO records (id, type, amount, category, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, type, amountCents, category, date, note ?? null, Date.now())
  const row = getDb()
    .prepare('SELECT id, type, amount, category, date, note, created_at as createdAt FROM records WHERE id = ?')
    .get(id)
  res.status(201).json({ ...row, amount: row.amount / 100 })
})

app.put('/api/records/:id', (req, res) => {
  const { id } = req.params
  const existing = getDb().prepare('SELECT id FROM records WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'not found' })

  const { type, amount, category, date, note } = req.body || {}
  const fields = []
  const values = []
  if (type !== undefined) {
    if (type !== 'income' && type !== 'expense') return res.status(400).json({ error: 'invalid type' })
    fields.push('type = ?'); values.push(type)
  }
  if (amount !== undefined) {
    const num = Number(amount)
    if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ error: 'invalid amount' })
    fields.push('amount = ?'); values.push(Math.round(num * 100))
  }
  if (category !== undefined) { fields.push('category = ?'); values.push(category) }
  if (date !== undefined) { fields.push('date = ?'); values.push(date) }
  if (note !== undefined) { fields.push('note = ?'); values.push(note || null) }

  if (fields.length === 0) return res.json({ ok: true, unchanged: true })

  values.push(id)
  getDb().prepare(`UPDATE records SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = getDb()
    .prepare('SELECT id, type, amount, category, date, note, created_at as createdAt FROM records WHERE id = ?')
    .get(id)
  res.json({ ...row, amount: row.amount / 100 })
})

app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params
  const info = getDb().prepare('DELETE FROM records WHERE id = ?').run(id)
  res.json({ deleted: info.changes })
})

app.delete('/api/records', (req, res) => {
  const info = getDb().prepare('DELETE FROM records').run()
  res.json({ deleted: info.changes })
})

// 健康检查
app.get('/api/health', (req, res) => {
  const count = getDb().prepare('SELECT COUNT(*) as n FROM records').get().n
  const accCount = getDb().prepare('SELECT COUNT(*) as n FROM accounts').get().n
  res.json({ ok: true, records: count, accounts: accCount, time: new Date().toISOString() })
})

// 清空记录和余额（保留账户/小项目/分类等元数据）
app.post('/api/clear-all', (req, res) => {
  resetRecordsAndBalances(getDb())
  res.json({ ok: true, message: 'records and balances cleared (accounts kept)' })
})

// ============ 备份 / 还原（全量 JSON） ============
app.get('/api/backup', (req, res) => {
  const db = getDb()
  const categories = db.prepare('SELECT id, name, type, icon, color FROM categories').all()
  const accounts = db
    .prepare('SELECT id, name, kind, icon, color, note, sort_order as sortOrder, archived, created_at as createdAt FROM accounts')
    .all()
  const subAccounts = db
    .prepare('SELECT id, account_id as accountId, name, icon, color, note, enabled, sort_order as sortOrder, created_at as createdAt FROM sub_accounts')
    .all()
  const records = db
    .prepare('SELECT id, type, amount, category, date, note, created_at as createdAt FROM records')
    .all()
    .map((r) => ({ ...r, amount: r.amount / 100 }))
  const balances = db
    .prepare('SELECT id, account_id as accountId, sub_account_id as subAccountId, amount, date, note, created_at as createdAt FROM balance_snapshots')
    .all()
    .map((r) => ({ ...r, amount: r.amount / 100 }))
  res.json({
    exportedAt: new Date().toISOString(),
    app: 'finance-app',
    version: 1,
    categories,
    accounts,
    subAccounts,
    records,
    balances,
  })
})

app.post('/api/restore', (req, res) => {
  const d = req.body || {}
  if (
    !Array.isArray(d.categories) ||
    !Array.isArray(d.accounts) ||
    !Array.isArray(d.records) ||
    !Array.isArray(d.balances)
  ) {
    return res.status(400).json({ error: 'invalid backup data (missing arrays)' })
  }
  const subAccounts = Array.isArray(d.subAccounts) ? d.subAccounts : []

  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM balance_snapshots').run()
    db.prepare('DELETE FROM records').run()
    db.prepare('DELETE FROM sub_accounts').run()
    db.prepare('DELETE FROM accounts').run()
    db.prepare('DELETE FROM categories').run()

    const insCat = db.prepare('INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)')
    for (const c of d.categories) insCat.run(c.id, c.name, c.type, c.icon, c.color)

    const insAcc = db.prepare(
      'INSERT INTO accounts (id, name, kind, icon, color, note, sort_order, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    for (const a of d.accounts) {
      insAcc.run(a.id, a.name, a.kind, a.icon, a.color, a.note ?? null, a.sortOrder ?? 0, a.archived ? 1 : 0, a.createdAt ?? Date.now())
    }

    const insSub = db.prepare(
      'INSERT INTO sub_accounts (id, account_id, name, icon, color, note, enabled, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    for (const s of subAccounts) {
      insSub.run(s.id, s.accountId, s.name, s.icon, s.color, s.note ?? null, s.enabled ? 1 : 0, s.sortOrder ?? 0, s.createdAt ?? Date.now())
    }

    const insRec = db.prepare(
      'INSERT INTO records (id, type, amount, category, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    for (const r of d.records) {
      insRec.run(r.id, r.type, Math.round(Number(r.amount) * 100), r.category, r.date, r.note ?? null, r.createdAt ?? Date.now())
    }

    const insBal = db.prepare(
      'INSERT INTO balance_snapshots (id, account_id, sub_account_id, amount, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    for (const b of d.balances) {
      insBal.run(b.id, b.accountId, b.subAccountId ?? null, Math.round(Number(b.amount) * 100), b.date, b.note ?? null, b.createdAt ?? Date.now())
    }
  })
  tx()

  res.json({
    ok: true,
    restored: {
      categories: d.categories.length,
      accounts: d.accounts.length,
      subAccounts: subAccounts.length,
      records: d.records.length,
      balances: d.balances.length,
    },
  })
})

// ============ 账户（用户自定义项目：支付宝/京东/同花顺…） ============
const ACCOUNT_COLS = 'id, name, kind, icon, color, note, sort_order as sortOrder, archived, created_at as createdAt'

const parseAccount = (row) => (row ? { ...row } : null)

app.get('/api/accounts', (req, res) => {
  const rows = getDb()
    .prepare(`SELECT ${ACCOUNT_COLS} FROM accounts WHERE archived = 0 ORDER BY sort_order, created_at`)
    .all()
  res.json(rows)
})

app.post('/api/accounts', (req, res) => {
  const { name, kind, icon, color, note } = req.body || {}
  if (!name || !kind || !icon || !color) {
    return res.status(400).json({ error: 'name/kind/icon/color required' })
  }
  const id = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const maxOrder = getDb().prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM accounts').get().m
  getDb()
    .prepare('INSERT INTO accounts (id, name, kind, icon, color, note, sort_order, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)')
    .run(id, name, kind, icon, color, note ?? null, maxOrder + 1, Date.now())
  const row = getDb().prepare(`SELECT ${ACCOUNT_COLS} FROM accounts WHERE id = ?`).get(id)
  res.status(201).json(parseAccount(row))
})

app.put('/api/accounts/:id', (req, res) => {
  const { id } = req.params
  const existing = getDb().prepare('SELECT id FROM accounts WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'not found' })

  const { name, kind, icon, color, note, sortOrder, archived } = req.body || {}
  const fields = []
  const values = []
  if (name !== undefined) { fields.push('name = ?'); values.push(name) }
  if (kind !== undefined) { fields.push('kind = ?'); values.push(kind) }
  if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }
  if (color !== undefined) { fields.push('color = ?'); values.push(color) }
  if (note !== undefined) { fields.push('note = ?'); values.push(note || null) }
  if (sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(Number(sortOrder)) }
  if (archived !== undefined) { fields.push('archived = ?'); values.push(archived ? 1 : 0) }
  if (fields.length === 0) return res.json(parseAccount(getDb().prepare(`SELECT ${ACCOUNT_COLS} FROM accounts WHERE id = ?`).get(id)))

  values.push(id)
  getDb().prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = getDb().prepare(`SELECT ${ACCOUNT_COLS} FROM accounts WHERE id = ?`).get(id)
  res.json(parseAccount(row))
})

// 删除账户（连带删除余额快照；谨慎操作）
app.delete('/api/accounts/:id', (req, res) => {
  const { id } = req.params
  const existing = getDb().prepare('SELECT id FROM accounts WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'not found' })
  const tx = getDb().transaction(() => {
    getDb().prepare('DELETE FROM sub_accounts WHERE account_id = ?').run(id)
    getDb().prepare('DELETE FROM balance_snapshots WHERE account_id = ?').run(id)
    getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id)
  })
  tx()
  res.json({ deleted: 1 })
})

// 批量调整账户顺序（拖拽排序后一次保存）
app.post('/api/accounts/reorder', (req, res) => {
  const { ids } = req.body || {}
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' })
  }
  const tx = getDb().transaction((ordered) => {
    const stmt = getDb().prepare('UPDATE accounts SET sort_order = ? WHERE id = ?')
    ordered.forEach((id, idx) => {
      stmt.run(idx + 1, id)
    })
  })
  tx(ids)
  res.json({ ok: true, reordered: ids.length })
})

// ============ 子账户（小项目：余额宝 / 股票 / 基金…） ============
const SUB_COLS = 'id, account_id as accountId, name, icon, color, note, enabled, sort_order as sortOrder, created_at as createdAt'

app.get('/api/sub-accounts', (req, res) => {
  const rows = getDb()
    .prepare(`SELECT ${SUB_COLS} FROM sub_accounts ORDER BY account_id, sort_order, created_at`)
    .all()
  res.json(rows)
})

app.get('/api/accounts/:id/sub-accounts', (req, res) => {
  const { id } = req.params
  const rows = getDb()
    .prepare(`SELECT ${SUB_COLS} FROM sub_accounts WHERE account_id = ? ORDER BY sort_order, created_at`)
    .all(id)
  res.json(rows)
})

app.post('/api/sub-accounts', (req, res) => {
  const { accountId, name, icon, color, note } = req.body || {}
  if (!accountId || !name || !icon || !color) {
    return res.status(400).json({ error: 'accountId/name/icon/color required' })
  }
  const acc = getDb().prepare('SELECT id FROM accounts WHERE id = ?').get(accountId)
  if (!acc) return res.status(404).json({ error: 'account not found' })
  const id = `sa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const maxOrder = getDb()
    .prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM sub_accounts WHERE account_id = ?')
    .get(accountId).m
  getDb()
    .prepare('INSERT INTO sub_accounts (id, account_id, name, icon, color, note, enabled, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)')
    .run(id, accountId, name, icon, color, note ?? null, maxOrder + 1, Date.now())
  const row = getDb().prepare(`SELECT ${SUB_COLS} FROM sub_accounts WHERE id = ?`).get(id)
  res.status(201).json(row)
})

app.put('/api/sub-accounts/:id', (req, res) => {
  const { id } = req.params
  const existing = getDb().prepare('SELECT id FROM sub_accounts WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'not found' })

  const { name, icon, color, note, enabled, sortOrder } = req.body || {}
  const fields = []
  const values = []
  if (name !== undefined) { fields.push('name = ?'); values.push(name) }
  if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }
  if (color !== undefined) { fields.push('color = ?'); values.push(color) }
  if (note !== undefined) { fields.push('note = ?'); values.push(note || null) }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0) }
  if (sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(Number(sortOrder)) }
  if (fields.length === 0) {
    return res.json(getDb().prepare(`SELECT ${SUB_COLS} FROM sub_accounts WHERE id = ?`).get(id))
  }

  values.push(id)
  getDb().prepare(`UPDATE sub_accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = getDb().prepare(`SELECT ${SUB_COLS} FROM sub_accounts WHERE id = ?`).get(id)
  res.json(row)
})

app.delete('/api/sub-accounts/:id', (req, res) => {
  const { id } = req.params
  const existing = getDb().prepare('SELECT id FROM sub_accounts WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'not found' })
  const tx = getDb().transaction(() => {
    getDb().prepare('DELETE FROM balance_snapshots WHERE sub_account_id = ?').run(id)
    getDb().prepare('DELETE FROM sub_accounts WHERE id = ?').run(id)
  })
  tx()
  res.json({ deleted: 1 })
})

// ============ 余额快照（某账户 / 某子账户在某天的余额） ============
const BALANCE_COLS = 'id, account_id as accountId, sub_account_id as subAccountId, amount, date, note, created_at as createdAt'

app.get('/api/balances', (req, res) => {
  const rows = getDb()
    .prepare(`SELECT ${BALANCE_COLS} FROM balance_snapshots ORDER BY date DESC, created_at DESC`)
    .all()
  res.json(rows.map((r) => ({ ...r, amount: r.amount / 100 })))
})

// 查询某账户的历史快照（含其子账户的）
app.get('/api/accounts/:id/balances', (req, res) => {
  const { id } = req.params
  const rows = getDb()
    .prepare(`SELECT ${BALANCE_COLS} FROM balance_snapshots WHERE account_id = ? ORDER BY date DESC, created_at DESC`)
    .all(id)
  res.json(rows.map((r) => ({ ...r, amount: r.amount / 100 })))
})

app.post('/api/balances', (req, res) => {
  const { accountId, subAccountId, amount, date, note } = req.body || {}
  if (!accountId) return res.status(400).json({ error: 'accountId required' })
  const acc = getDb().prepare('SELECT id FROM accounts WHERE id = ?').get(accountId)
  if (!acc) return res.status(404).json({ error: 'account not found' })
  if (subAccountId) {
    const sub = getDb().prepare('SELECT id FROM sub_accounts WHERE id = ? AND account_id = ?').get(subAccountId, accountId)
    if (!sub) return res.status(404).json({ error: 'sub-account not found for this account' })
  }
  const num = Number(amount)
  if (!Number.isFinite(num)) return res.status(400).json({ error: 'invalid amount' })
  if (!date) return res.status(400).json({ error: 'date required' })

  const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  getDb()
    .prepare('INSERT INTO balance_snapshots (id, account_id, sub_account_id, amount, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, accountId, subAccountId ?? null, Math.round(num * 100), date, note ?? null, Date.now())
  const row = getDb().prepare(`SELECT ${BALANCE_COLS} FROM balance_snapshots WHERE id = ?`).get(id)
  res.status(201).json({ ...row, amount: row.amount / 100 })
})

// 批量新增余额快照
app.post('/api/balances/batch', (req, res) => {
  const { items } = req.body || {}
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' })
  }
  // 校验
  for (const [idx, it] of items.entries()) {
    if (!it || !it.accountId) return res.status(400).json({ error: `item[${idx}].accountId required` })
    const num = Number(it.amount)
    if (!Number.isFinite(num)) return res.status(400).json({ error: `item[${idx}].amount invalid` })
    if (!it.date) return res.status(400).json({ error: `item[${idx}].date required` })
  }

  const db = getDb()
  const accStmt = db.prepare('SELECT id FROM accounts WHERE id = ?')
  const subStmt = db.prepare('SELECT id FROM sub_accounts WHERE id = ? AND account_id = ?')
  const insStmt = db.prepare(
    'INSERT INTO balance_snapshots (id, account_id, sub_account_id, amount, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )

  const tx = db.transaction((list) => {
    const createdIds = []
    list.forEach((it, i) => {
      const acc = accStmt.get(it.accountId)
      if (!acc) throw new Error(`item[${i}].account not found: ${it.accountId}`)
      if (it.subAccountId) {
        const sub = subStmt.get(it.subAccountId, it.accountId)
        if (!sub) throw new Error(`item[${i}].sub-account invalid: ${it.subAccountId}`)
      }
      const id = `b-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`
      insStmt.run(
        id,
        it.accountId,
        it.subAccountId ?? null,
        Math.round(Number(it.amount) * 100),
        it.date,
        it.note ?? null,
        Date.now(),
      )
      createdIds.push(id)
    })
    return createdIds
  })

  try {
    const createdIds = tx(items)
    // 返回完整行（前端做增量合并，避免全量重拉）
    const placeholders = createdIds.map(() => '?').join(',')
    const rows = createdIds.length > 0
      ? db.prepare(`SELECT ${BALANCE_COLS} FROM balance_snapshots WHERE id IN (${placeholders})`).all(...createdIds)
      : []
    res.status(201).json({ ok: true, count: rows.length, items: rows.map((r) => ({ ...r, amount: r.amount / 100 })) })
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) })
  }
})

app.put('/api/balances/:id', (req, res) => {
  const { id } = req.params
  const existing = getDb().prepare('SELECT id FROM balance_snapshots WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'not found' })

  const { amount, date, note, subAccountId } = req.body || {}
  const fields = []
  const values = []
  if (amount !== undefined) {
    const num = Number(amount)
    if (!Number.isFinite(num)) return res.status(400).json({ error: 'invalid amount' })
    fields.push('amount = ?'); values.push(Math.round(num * 100))
  }
  if (date !== undefined) { fields.push('date = ?'); values.push(date) }
  if (note !== undefined) { fields.push('note = ?'); values.push(note || null) }
  if (subAccountId !== undefined) { fields.push('sub_account_id = ?'); values.push(subAccountId) }
  if (fields.length === 0) return res.json({ ok: true, unchanged: true })

  values.push(id)
  getDb().prepare(`UPDATE balance_snapshots SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = getDb().prepare(`SELECT ${BALANCE_COLS} FROM balance_snapshots WHERE id = ?`).get(id)
  res.json({ ...row, amount: row.amount / 100 })
})

app.delete('/api/balances/:id', (req, res) => {
  const { id } = req.params
  const info = getDb().prepare('DELETE FROM balance_snapshots WHERE id = ?').run(id)
  res.json({ deleted: info.changes })
})

// 批量删除余额快照
app.post('/api/balances/batch-delete', (req, res) => {
  const { ids } = req.body || {}
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' })
  }
  const tx = getDb().transaction((list) => {
    const stmt = getDb().prepare('DELETE FROM balance_snapshots WHERE id = ?')
    for (const id of list) {
      stmt.run(id)
    }
    return list.length
  })
  const deleted = tx(ids)
  res.json({ ok: true, deleted })
})

// 按日期批量删除某时间节点下的所有记录（精确匹配 date 字段）
app.post('/api/balances/batch-delete-by-date', (req, res) => {
  const { dates } = req.body || {}
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'dates array required' })
  }
  const placeholders = dates.map(() => '?').join(',')
  const tx = getDb().transaction((list) => {
    const info = getDb().prepare(`DELETE FROM balance_snapshots WHERE date IN (${placeholders})`).run(...list)
    return info.changes
  })
  const deleted = tx(dates)
  res.json({ ok: true, deleted, dates })
})

// ============ 月度报表 PDF 导出（账户余额） ============
// GET /api/pdf/monthly?month=YYYY-MM（month 可选，决定标题；PDF 内包含所有历史月份）
app.get('/api/pdf/monthly', async (req, res) => {
  const monthParam = (req.query.month || '').toString()
  // month 可选：缺省 = 当前月
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : dayjs().format('YYYY-MM')
  try {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="balance-monthly-${month}.pdf"`,
    )
    await renderMonthlyPDF(month, res)
  } catch (err) {
    console.error('[pdf] 生成失败:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: `PDF 生成失败：${err.message || err}` })
    } else {
      res.end()
    }
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[finance-api] listening on http://127.0.0.1:${PORT}`)
  console.log(`[finance-api] data file: ${DB_PATH}`)
})
