import dayjs from 'dayjs'
import type { FinanceRecord, MonthStat } from '../types'

export { dayjs }

export const monthKey = (date: dayjs.Dayjs | string): string => {
  return dayjs(date).format('YYYY-MM')
}

export const filterByMonth = (records: FinanceRecord[], month: string): FinanceRecord[] => {
  return records.filter((r) => monthKey(r.date) === month)
}

export const summarizeMonth = (records: FinanceRecord[], month: string) => {
  const list = filterByMonth(records, month)
  const income = list.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const expense = list.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  return { income, expense, balance: income - expense, count: list.length, list }
}

export const aggregateByCategory = (
  records: FinanceRecord[],
  type: 'income' | 'expense',
): Array<{ category: string; amount: number }> => {
  const map = new Map<string, number>()
  records
    .filter((r) => r.type === type)
    .forEach((r) => {
      map.set(r.category, (map.get(r.category) || 0) + r.amount)
    })
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

// 最近 N 个月的趋势数据（含空月）
export const lastNMonthsTrend = (records: FinanceRecord[], n: number): MonthStat[] => {
  const now = dayjs()
  const result: MonthStat[] = []
  for (let i = n - 1; i >= 0; i--) {
    const m = now.subtract(i, 'month').format('YYYY-MM')
    const { income, expense } = summarizeMonth(records, m)
    result.push({ month: m, income, expense, balance: income - expense })
  }
  return result
}
