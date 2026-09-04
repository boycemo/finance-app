// 简单的 fetch 封装，统一处理 baseURL + JSON
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://127.0.0.1:3001'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      if (data?.error) detail = data.error
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status)
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

import type { Account, BalanceSnapshot, Category, FinanceRecord, SubAccount } from '../types'

export const api = {
  base: BASE,
  health: () => request<{ ok: boolean; records: number; accounts: number; time: string }>('/api/health'),
  // 记录
  getCategories: () => request<Category[]>('/api/categories'),
  // month: 只取该月记录；limit: 只取最近 N 条（不传 = 全量）
  getRecords: (opts?: { month?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (opts?.month) q.set('month', opts.month)
    if (opts?.limit) q.set('limit', String(opts.limit))
    const qs = q.toString()
    return request<FinanceRecord[]>(`/api/records${qs ? `?${qs}` : ''}`)
  },
  addRecord: (r: Omit<FinanceRecord, 'id' | 'createdAt'>) =>
    request<FinanceRecord>('/api/records', { method: 'POST', body: JSON.stringify(r) }),
  updateRecord: (id: string, patch: Partial<FinanceRecord>) =>
    request<FinanceRecord>(`/api/records/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteRecord: (id: string) =>
    request<{ deleted: number }>(`/api/records/${id}`, { method: 'DELETE' }),
  clearRecords: () => request<{ deleted: number }>('/api/records', { method: 'DELETE' }),
  // 账户
  getAccounts: () => request<Account[]>('/api/accounts'),
  addAccount: (a: Omit<Account, 'id' | 'sortOrder' | 'archived' | 'createdAt'>) =>
    request<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(a) }),
  updateAccount: (id: string, patch: Partial<Account>) =>
    request<Account>(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteAccount: (id: string) =>
    request<{ deleted: number }>(`/api/accounts/${id}`, { method: 'DELETE' }),
  reorderAccounts: (ids: string[]) =>
    request<{ ok: boolean; reordered: number }>('/api/accounts/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  // 子账户（小项目）
  getSubAccounts: () => request<SubAccount[]>('/api/sub-accounts'),
  getAccountSubAccounts: (accountId: string) =>
    request<SubAccount[]>(`/api/accounts/${accountId}/sub-accounts`),
  addSubAccount: (s: Omit<SubAccount, 'id' | 'enabled' | 'sortOrder' | 'createdAt'>) =>
    request<SubAccount>('/api/sub-accounts', { method: 'POST', body: JSON.stringify(s) }),
  updateSubAccount: (id: string, patch: Partial<SubAccount>) =>
    request<SubAccount>(`/api/sub-accounts/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteSubAccount: (id: string) =>
    request<{ deleted: number }>(`/api/sub-accounts/${id}`, { method: 'DELETE' }),
  // 余额快照
  getBalances: () => request<BalanceSnapshot[]>('/api/balances'),
  getAccountBalances: (accountId: string) =>
    request<BalanceSnapshot[]>(`/api/accounts/${accountId}/balances`),
  addBalance: (b: Omit<BalanceSnapshot, 'id' | 'createdAt'>) =>
    request<BalanceSnapshot>('/api/balances', { method: 'POST', body: JSON.stringify(b) }),
  batchAddBalances: (items: Omit<BalanceSnapshot, 'id' | 'createdAt'>[]) =>
    request<{ ok: boolean; count: number; items: BalanceSnapshot[] }>('/api/balances/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  updateBalance: (id: string, patch: Partial<BalanceSnapshot>) =>
    request<BalanceSnapshot>(`/api/balances/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteBalance: (id: string) =>
    request<{ deleted: number }>(`/api/balances/${id}`, { method: 'DELETE' }),
  batchDeleteBalances: (ids: string[]) =>
    request<{ ok: boolean; deleted: number }>('/api/balances/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  batchDeleteByDate: (dates: string[]) =>
    request<{ ok: boolean; deleted: number; dates: string[] }>(
      '/api/balances/batch-delete-by-date',
      { method: 'POST', body: JSON.stringify({ dates }) },
    ),
  // 清空全部数据（记录/余额/账户/子账户，恢复默认）
  clearAll: () => request<{ ok: boolean; message: string }>('/api/clear-all', { method: 'POST' }),
  // 备份 / 还原
  getBackup: () => request<BackupData>('/api/backup'),
  restoreBackup: (data: BackupData) =>
    request<{ ok: boolean; restored: Record<string, number> }>('/api/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 月度报表 PDF（直接打开下载）
  downloadMonthlyPDF: (month: string) => {
    window.open(`${BASE}/api/pdf/monthly?month=${encodeURIComponent(month)}`, '_blank')
  },
}

export interface BackupData {
  exportedAt: string
  app?: string
  version?: number
  categories: Category[]
  accounts: Account[]
  subAccounts: SubAccount[]
  records: FinanceRecord[]
  balances: BalanceSnapshot[]
}
