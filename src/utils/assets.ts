import dayjs from 'dayjs'
import type { Account, AccountKind, BalanceSnapshot, SubAccount } from '../types'

// ============ 余额聚合（当月口径，无记录为 0） ============

// 某账户在「某月」的余额：
// 只统计当月内的余额快照（不继承上期），当月无任何记录 → 0。
// 若账户启用了子账户 → 各启用子账户当月内最新快照之和；否则 → 账户直录当月内最近一条。
export function accountMonthlyBalance(
  account: Account,
  balances: BalanceSnapshot[],
  subAccounts: SubAccount[],
  month: string, // YYYY-MM
): number {
  const monthStart = dayjs(`${month}-01`).format('YYYY-MM-DD')
  const monthEnd = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD')

  const latestInRange = (filter: (b: BalanceSnapshot) => boolean): number => {
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

// 账户当前最新余额（本月口径，无记录为 0）
export function accountLatestBalance(
  account: Account,
  balances: BalanceSnapshot[],
  subAccounts: SubAccount[],
): number {
  const now = dayjs().format('YYYY-MM')
  return accountMonthlyBalance(account, balances, subAccounts, now)
}

// 所有余额快照中最新的一天（无记录返回 null）
export function latestBalanceDate(balances: BalanceSnapshot[]): string | null {
  if (balances.length === 0) return null
  let max = balances[0].date
  for (const b of balances) {
    if (b.date > max) max = b.date
  }
  return max
}

// 账户在"最新记录日"的余额（即使本月没有记录也能正确显示，继承最近一次快照）
export function accountBalanceAtLatest(
  account: Account,
  balances: BalanceSnapshot[],
  subAccounts: SubAccount[],
): number {
  const latest = latestBalanceDate(balances)
  if (!latest) return 0
  return accountBalanceOnDate(account, balances, subAccounts, latest)
}

// 最近 N 个月（含当月），返回 YYYY-MM 数组，正序（旧→新）
export function lastNMonths(n: number): string[] {
  const now = dayjs()
  const arr: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    arr.push(now.subtract(i, 'month').format('YYYY-MM'))
  }
  return arr
}

// 构建月度报表矩阵（当月口径，无记录月份为 0）
// 返回：rows: Array<{ month, values: Record<accountId, number>, total: number }>
export function buildMonthlyReport(
  accounts: Account[],
  balances: BalanceSnapshot[],
  subAccounts: SubAccount[],
  months: string[],
) {
  const rows = months.map((month) => {
    const values: Record<string, number> = {}
    let total = 0
    for (const acc of accounts) {
      const v = accountMonthlyBalance(acc, balances, subAccounts, month)
      values[acc.id] = v
      total += v
    }
    return { month, values, total }
  })
  return rows
}

// 月份标签：YYYY-MM -> 8月 / 2025年8月
export const monthShortLabel = (m: string) => `${parseInt(m.split('-')[1], 10)}月`
export const monthFullLabel = (m: string) => {
  const [y, mm] = m.split('-')
  return `${y}年${parseInt(mm, 10)}月`
}

// 全部历史月份：从最早有余额记录的月份到当前月（逐月连续，中间无记录的也包含）
export function allMonthsFromRecords(balances: BalanceSnapshot[]): string[] {
  const dates = balances.map((b) => b.date).sort()
  if (dates.length === 0) return []
  const start = dates[0].slice(0, 7)
  const end = dayjs().format('YYYY-MM')
  const arr: string[] = []
  let cur = dayjs(`${start}-01`)
  while (cur.format('YYYY-MM') <= end) {
    arr.push(cur.format('YYYY-MM'))
    cur = cur.add(1, 'month')
  }
  return arr
}

// 该月的"补录日期"：历史月用月末，当前月用今天
export function fillDateForMonth(month: string): string {
  const now = dayjs()
  if (month === now.format('YYYY-MM')) return now.format('YYYY-MM-DD')
  return dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD')
}

// ============ 时间点趋势（每次录入 = 一个数据点） ============

// 收集所有有余额的日期（去重，正序）
export function collectBalanceDates(balances: BalanceSnapshot[]): string[] {
  const set = new Set<string>()
  balances.forEach((b) => set.add(b.date))
  return Array.from(set).sort()
}

// 某账户在某日期的余额（取该日期内最近一条快照）
export function accountBalanceOnDate(
  account: Account,
  balances: BalanceSnapshot[],
  subAccounts: SubAccount[],
  date: string,
): number {
  // 截止该日期（含）的最近一次快照（沿用月度聚合里聚合逻辑）
  const enabledSubs = subAccounts
    .filter((s) => s.accountId === account.id && s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (enabledSubs.length > 0) {
    return enabledSubs.reduce((sum, s) => {
      const latest = balances
        .filter((b) => b.subAccountId === s.id && b.date <= date)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))[0]
      return sum + (latest ? latest.amount : 0)
    }, 0)
  }
  const direct = balances
    .filter((b) => b.accountId === account.id && !b.subAccountId && b.date <= date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))[0]
  return direct ? direct.amount : 0
}

// 某账户在某一天「当天」的余额（只统计该日当天的快照，无记录 = 0）
// 与月度报表口径一致，供趋势图使用
export function accountBalanceOnDay(
  account: Account,
  balances: BalanceSnapshot[],
  subAccounts: SubAccount[],
  date: string,
): number {
  const enabledSubs = subAccounts
    .filter((s) => s.accountId === account.id && s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (enabledSubs.length > 0) {
    return enabledSubs.reduce((sum, s) => {
      const latest = balances
        .filter((b) => b.subAccountId === s.id && b.date === date)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))[0]
      return sum + (latest ? latest.amount : 0)
    }, 0)
  }
  const direct = balances
    .filter((b) => b.accountId === account.id && !b.subAccountId && b.date === date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))[0]
  return direct ? direct.amount : 0
}

// 趋势数据：每个有余额的日期 = 一个数据点（当天口径）
export function buildTimeSeries(
  accounts: Account[],
  balances: BalanceSnapshot[],
  subAccounts: SubAccount[],
  dates: string[],
) {
  const active = accounts.filter((a) => !a.archived)
  return dates.map((date) => {
    const values: Record<string, number> = {}
    let total = 0
    for (const acc of active) {
      const v = accountBalanceOnDay(acc, balances, subAccounts, date)
      values[acc.id] = v
      total += v
    }
    return { date, values, total }
  })
}

// ============ 负债/应收 类型符号规则 ============
// payable / credit → 存为负数（负债/欠款）
// receivable      → 存为正数（应收，但前端展示时翻为负的语义「别人欠你」其实存为正）
// 其他            → 原样
// 实际：我们让前端展示时统一以「正数=资产/应收」「负数=负债/应付」为标准语义，
// payable/credit 的输入前端统一为正数（用户友好），存库时取负。
export function signedAmount(amount: number, kind: AccountKind | undefined): number {
  if (kind === 'payable' || kind === 'credit') {
    return -Math.abs(amount)
  }
  return Math.abs(amount)
}

export const NEGATIVE_KINDS: AccountKind[] = ['payable', 'credit']
