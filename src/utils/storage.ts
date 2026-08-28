import dayjs from 'dayjs'
import type { Category, FinanceRecord } from '../types'

const RECORDS_KEY = 'finance:records'
const CATEGORIES_KEY = 'finance:categories'
const SEEDED_KEY = 'finance:seeded'

// 内置默认分类
export const DEFAULT_CATEGORIES: Category[] = [
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

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getRecords(): FinanceRecord[] {
  return readJSON<FinanceRecord[]>(RECORDS_KEY, [])
}

export function saveRecords(records: FinanceRecord[]): void {
  writeJSON(RECORDS_KEY, records)
}

export function addRecord(record: Omit<FinanceRecord, 'id' | 'createdAt'>): FinanceRecord {
  const records = getRecords()
  const newRecord: FinanceRecord = {
    ...record,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  }
  records.unshift(newRecord)
  saveRecords(records)
  return newRecord
}

export function updateRecord(id: string, patch: Partial<FinanceRecord>): void {
  saveRecords(getRecords().map((r) => (r.id === id ? { ...r, ...patch } : r)))
}

export function deleteRecord(id: string): void {
  saveRecords(getRecords().filter((r) => r.id !== id))
}

export function getCategories(): Category[] {
  return readJSON<Category[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES)
}

export function saveCategories(categories: Category[]): void {
  writeJSON(CATEGORIES_KEY, categories)
}

// 首次进入自动填充 3 条示例数据
export function seedIfEmpty(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(SEEDED_KEY)) return

  const now = dayjs()
  const samples: Omit<FinanceRecord, 'id' | 'createdAt'>[] = [
    {
      type: 'income',
      amount: 12000,
      category: 'c-salary',
      date: now.date(5).format('YYYY-MM-DD'),
      note: '月度工资',
    },
    {
      type: 'expense',
      amount: 68,
      category: 'c-food',
      date: now.format('YYYY-MM-DD'),
      note: '午餐',
    },
    {
      type: 'expense',
      amount: 2500,
      category: 'c-housing',
      date: now.date(1).format('YYYY-MM-DD'),
      note: '房租',
    },
  ]

  const records: FinanceRecord[] = samples.map((s) => ({
    ...s,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  }))
  saveRecords(records)
  localStorage.setItem(SEEDED_KEY, '1')
}

export function resetAll(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RECORDS_KEY)
  localStorage.removeItem(CATEGORIES_KEY)
  localStorage.removeItem(SEEDED_KEY)
}
