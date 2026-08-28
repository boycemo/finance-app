import Database from 'better-sqlite3'

let _db = null

// 默认分类（与前端保持一致）
const DEFAULT_CATEGORIES = [
  // 支出
  { id: 'c-food', name: '餐饮', type: 'expense', icon: '🍜', color: '#f97316' },
  { id: 'c-transport', name: '交通', type: 'expense', icon: '🚇', color: '#3b82f6' },
  { id: 'c-shopping', name: '购物', type: 'expense', icon: '🛍️', color: '#a855f7' },
  { id: 'c-entertain', name: '娱乐', type: 'expense', icon: '🎮', color: '#ec4899' },
  { id: 'c-housing', name: '住房', type: 'expense', icon: '🏠', color: '#22c55e' },
  { id: 'c-medical', name: '医疗', type: 'expense', icon: '💊', color: '#06b6d4' },
  { id: 'c-edu', name: '学习', type: 'expense', icon: '📚', color: '#6366f1' },
  { id: 'c-other', name: '其他', type: 'expense', icon: '📦', color: '#94a3b8' },
  // 收入
  { id: 'c-salary', name: '工资', type: 'income', icon: '💼', color: '#10b981' },
  { id: 'c-bonus', name: '奖金', type: 'income', icon: '🎁', color: '#f59e0b' },
  { id: 'c-invest', name: '投资', type: 'income', icon: '📈', color: '#14b8a6' },
  { id: 'c-parttime', name: '兼职', type: 'income', icon: '💵', color: '#0ea5e9' },
  { id: 'c-other-in', name: '其他', type: 'income', icon: '💰', color: '#94a3b8' },
]

// 默认账户（用户可编辑/删除/新增）
const DEFAULT_ACCOUNTS = [
  { id: 'a-alipay',   name: '支付宝',     kind: 'cash',        icon: '💳', color: '#1677ff', note: '', sort_order: 1 },
  { id: 'a-jd',       name: '京东金融',   kind: 'cash',        icon: '🟧', color: '#f97316', note: '', sort_order: 2 },
  { id: 'a-ths',      name: '同花顺',     kind: 'investment',  icon: '📈', color: '#dc2626', note: '证券账户', sort_order: 3 },
  { id: 'a-fund',     name: '基金账户',   kind: 'fund',        icon: '🏦', color: '#8b5cf6', note: '', sort_order: 4 },
]

// 默认小项目（预置给默认账户，可开关/编辑/删除/新增）
const DEFAULT_SUB_ACCOUNTS = [
  // 支付宝
  { id: 'sa-alipay-balance', account_id: 'a-alipay', name: '余额',   icon: '💰', color: '#1677ff', note: '', sort_order: 1 },
  { id: 'sa-alipay-yeb',     account_id: 'a-alipay', name: '余额宝', icon: '🟠', color: '#f59e0b', note: '货币基金', sort_order: 2 },
  { id: 'sa-alipay-ylb',     account_id: 'a-alipay', name: '余利宝', icon: '🟡', color: '#eab308', note: '', sort_order: 3 },
  // 京东金融
  { id: 'sa-jd-xjk',         account_id: 'a-jd',     name: '小金库', icon: '💰', color: '#f97316', note: '', sort_order: 1 },
  // 同花顺
  { id: 'sa-ths-stock',      account_id: 'a-ths',    name: '股票',   icon: '🧾', color: '#dc2626', note: '股票市值', sort_order: 1 },
  { id: 'sa-ths-fund',       account_id: 'a-ths',    name: '场内基金', icon: '🏦', color: '#8b5cf6', note: '', sort_order: 2 },
  // 基金账户
  { id: 'sa-fund-money',     account_id: 'a-fund',   name: '货币基金', icon: '🏦', color: '#06b6d4', note: '', sort_order: 1 },
  { id: 'sa-fund-bond',      account_id: 'a-fund',   name: '债券基金', icon: '📊', color: '#10b981', note: '', sort_order: 2 },
  { id: 'sa-fund-equity',    account_id: 'a-fund',   name: '股票基金', icon: '📈', color: '#8b5cf6', note: '', sort_order: 3 },
]

export function initDb(filePath) {
  if (_db) return _db
  _db = new Database(filePath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      icon TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount INTEGER NOT NULL,            -- 以「分」为单位存储，避免浮点误差
      category TEXT NOT NULL,
      date TEXT NOT NULL,                 -- YYYY-MM-DD
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
    CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);

    -- ========== 账户（用户自定义：支付宝/京东/同花顺 等） ==========
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,                 -- 显示名「支付宝」「同花顺」
      kind TEXT NOT NULL CHECK(kind IN ('cash','investment','fund','credit','receivable','payable','other')),
      icon TEXT NOT NULL,                 -- emoji
      color TEXT NOT NULL,                -- 主题色
      note TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- ========== 余额快照（按月 / 按日 记录某账户当时的余额） ==========
    CREATE TABLE IF NOT EXISTS balance_snapshots (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      sub_account_id TEXT,               -- 挂在子账户下（可空 = 账户直录）
      amount INTEGER NOT NULL,            -- 以「分」为单位
      date TEXT NOT NULL,                 -- YYYY-MM-DD
      note TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_balance_account ON balance_snapshots(account_id);
    CREATE INDEX IF NOT EXISTS idx_balance_date ON balance_snapshots(date);

    -- ========== 子账户（小项目：余额宝 / 股票 / 基金…，可开关） ==========
    CREATE TABLE IF NOT EXISTS sub_accounts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      note TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sub_accounts_account ON sub_accounts(account_id);
  `)

  // 兼容旧库：给 balance_snapshots 补 sub_account_id 列
  const balanceCols = _db.pragma('table_info(balance_snapshots)').map((c) => c.name)
  if (!balanceCols.includes('sub_account_id')) {
    _db.exec(
      'ALTER TABLE balance_snapshots ADD COLUMN sub_account_id TEXT REFERENCES sub_accounts(id) ON DELETE SET NULL',
    )
    console.log('[finance-api] migrated balance_snapshots: + sub_account_id')
  }

  // 兼容旧库：accounts 表的 CHECK 约束升级（增加 credit / receivable / payable）
  const accountsCols = _db.pragma('table_info(accounts)').map((c) => c.name)
  // pragma 拿不到 CHECK 内容，尝试插入新枚举触发检测
  if (accountsCols.length > 0) {
    try {
      _db.prepare(
        "INSERT INTO accounts (id, name, kind, icon, color, sort_order, created_at) VALUES ('__kind_probe__', 'probe', 'credit', '💳', '#000000', 9999, 0)",
      ).run()
      // 没抛错说明旧库已升级过；回滚该条
      _db.prepare("DELETE FROM accounts WHERE id = '__kind_probe__'").run()
    } catch (err) {
      if (String(err.message || err).includes('CHECK constraint failed')) {
        // 旧 CHECK 还在：重建 accounts 表
        console.log('[finance-api] migrating accounts: rebuilding CHECK constraint...')
        const _tx = _db.transaction(() => {
          _db.exec(`
            CREATE TABLE IF NOT EXISTS accounts_new (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              kind TEXT NOT NULL CHECK(kind IN ('cash','investment','fund','credit','receivable','payable','other')),
              icon TEXT NOT NULL,
              color TEXT NOT NULL,
              note TEXT,
              sort_order INTEGER NOT NULL DEFAULT 0,
              archived INTEGER NOT NULL DEFAULT 0,
              created_at INTEGER NOT NULL
            );
            INSERT INTO accounts_new (id, name, kind, icon, color, note, sort_order, archived, created_at)
              SELECT id, name, kind, icon, color, note, sort_order, archived, created_at FROM accounts;
            DROP TABLE accounts;
            ALTER TABLE accounts_new RENAME TO accounts;
          `)
        })
        _tx()
        console.log('[finance-api] accounts CHECK constraint upgraded')
      }
    }
  }

  // 首次启动：插入默认分类
  const count = _db.prepare('SELECT COUNT(*) as n FROM categories').get().n
  if (count === 0) {
    seedCategories(_db)
  }

  // 首次启动：插入示例账户（用户可编辑/删除/新增）
  const accCount = _db.prepare('SELECT COUNT(*) as n FROM accounts').get().n
  if (accCount === 0) {
    seedAccounts(_db)
  }

  // 首次启动：给预置账户插入常见小项目（用户可开关/编辑/删除）
  const subCount = _db.prepare('SELECT COUNT(*) as n FROM sub_accounts').get().n
  if (subCount === 0) {
    seedSubAccounts(_db)
  }

  return _db
}

function seedCategories(db) {
  const insert = db.prepare(
    'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
  )
  const tx = db.transaction((items) => {
    for (const c of items) {
      insert.run(c.id, c.name, c.type, c.icon, c.color)
    }
  })
  tx(DEFAULT_CATEGORIES)
  console.log(`[finance-api] seeded ${DEFAULT_CATEGORIES.length} default categories`)
}

function seedAccounts(db) {
  const accInsert = db.prepare(
    'INSERT INTO accounts (id, name, kind, icon, color, note, sort_order, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
  )
  const txAcc = db.transaction((items) => {
    for (const a of items) {
      accInsert.run(a.id, a.name, a.kind, a.icon, a.color, a.note ?? null, a.sort_order, Date.now())
    }
  })
  txAcc(DEFAULT_ACCOUNTS)
  console.log(`[finance-api] seeded ${DEFAULT_ACCOUNTS.length} default accounts`)
}

function seedSubAccounts(db) {
  const subInsert = db.prepare(
    'INSERT INTO sub_accounts (id, account_id, name, icon, color, note, enabled, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
  )
  const txSub = db.transaction((items) => {
    for (const s of items) {
      // 只给仍然存在的账户预置
      const acc = db.prepare('SELECT id FROM accounts WHERE id = ?').get(s.account_id)
      if (acc) subInsert.run(s.id, s.account_id, s.name, s.icon, s.color, s.note ?? null, s.sort_order, Date.now())
    }
  })
  txSub(DEFAULT_SUB_ACCOUNTS)
  console.log(`[finance-api] seeded ${DEFAULT_SUB_ACCOUNTS.length} default sub-accounts`)
}

// 清空记录和余额（保留账户/小账户/分类等元数据）
export function resetRecordsAndBalances(db) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM balance_snapshots').run()
    db.prepare('DELETE FROM records').run()
  })
  tx()
  console.log('[finance-api] reset records & balances (kept accounts/sub-accounts/categories)')
}

export function getDb() {
  if (!_db) throw new Error('db not initialized')
  return _db
}
