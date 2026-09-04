import { useCallback, useEffect, useState } from 'react'
import { api } from '../utils/api'
import type { Account, BalanceSnapshot, SubAccount } from '../types'

interface State {
  accounts: Account[]
  subAccounts: SubAccount[]
  balances: BalanceSnapshot[]
  loading: boolean
  error: string | null
}

export function useAssets() {
  const [state, setState] = useState<State>({
    accounts: [],
    subAccounts: [],
    balances: [],
    loading: true,
    error: null,
  })

  const loadAll = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [accounts, subAccounts, balances] = await Promise.all([
        api.getAccounts(),
        api.getSubAccounts(),
        api.getBalances(),
      ])
      setState({ accounts, subAccounts, balances, loading: false, error: null })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: String(err) }))
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const addAccount = useCallback(async (a: Omit<Account, 'id' | 'sortOrder' | 'archived' | 'createdAt'>) => {
    const created = await api.addAccount(a)
    setState((s) => ({ ...s, accounts: [...s.accounts, created] }))
    return created
  }, [])

  const updateAccount = useCallback(async (id: string, patch: Partial<Account>) => {
    const updated = await api.updateAccount(id, patch)
    setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? updated : a)) }))
  }, [])

  const deleteAccount = useCallback(async (id: string) => {
    await api.deleteAccount(id)
    setState((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => a.id !== id),
      subAccounts: s.subAccounts.filter((sa) => sa.accountId !== id),
      balances: s.balances.filter((b) => b.accountId !== id),
    }))
  }, [])

  // 拖拽排序：按新顺序持久化
  const reorderAccounts = useCallback(async (orderedIds: string[]) => {
    if (orderedIds.length === 0) return
    await api.reorderAccounts(orderedIds)
    setState((s) => {
      const map = new Map(s.accounts.map((a) => [a.id, a]))
      const next = orderedIds
        .map((id) => map.get(id))
        .filter((a): a is Account => Boolean(a))
      // 补上没参与排序的账户（理论上不会发生）
      s.accounts.forEach((a) => {
        if (!orderedIds.includes(a.id)) next.push(a)
      })
      return { ...s, accounts: next }
    })
  }, [])

  // ===== 子账户 =====
  const addSubAccount = useCallback(async (sa: Omit<SubAccount, 'id' | 'enabled' | 'sortOrder' | 'createdAt'>) => {
    const created = await api.addSubAccount(sa)
    setState((s) => ({ ...s, subAccounts: [...s.subAccounts, created] }))
  }, [])

  const updateSubAccount = useCallback(async (id: string, patch: Partial<SubAccount>) => {
    const updated = await api.updateSubAccount(id, patch)
    setState((s) => ({
      ...s,
      subAccounts: s.subAccounts.map((sa) => (sa.id === id ? updated : sa)),
    }))
  }, [])

  const deleteSubAccount = useCallback(async (id: string) => {
    await api.deleteSubAccount(id)
    setState((s) => ({
      ...s,
      subAccounts: s.subAccounts.filter((sa) => sa.id !== id),
      balances: s.balances.filter((b) => b.subAccountId !== id),
    }))
  }, [])

  // ===== 余额快照 =====
  const addBalance = useCallback(async (b: Omit<BalanceSnapshot, 'id' | 'createdAt'>) => {
    const created = await api.addBalance(b)
    setState((s) => ({ ...s, balances: [created, ...s.balances] }))
  }, [])

  const batchAddBalances = useCallback(
    async (items: Omit<BalanceSnapshot, 'id' | 'createdAt'>[]) => {
      if (items.length === 0) return
      // 增量合并：服务端返回完整行，直接并进 state，避免全量重拉
      const { items: created } = await api.batchAddBalances(items)
      if (created && created.length > 0) {
        setState((s) => ({ ...s, balances: [...created, ...s.balances] }))
      }
    },
    [],
  )

  const updateBalance = useCallback(async (id: string, patch: Partial<BalanceSnapshot>) => {
    const updated = await api.updateBalance(id, patch)
    setState((s) => ({
      ...s,
      balances: s.balances.map((b) => (b.id === id ? updated : b)),
    }))
  }, [])

  const deleteBalance = useCallback(async (id: string) => {
    await api.deleteBalance(id)
    setState((s) => ({ ...s, balances: s.balances.filter((b) => b.id !== id) }))
  }, [])

  const batchDeleteBalances = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    await api.batchDeleteBalances(ids)
    setState((s) => ({ ...s, balances: s.balances.filter((b) => !ids.includes(b.id)) }))
  }, [])

  // 按日期批量删除（事务一次性）
  const batchDeleteByDate = useCallback(async (dates: string[]) => {
    if (dates.length === 0) return
    await api.batchDeleteByDate(dates)
    setState((s) => ({ ...s, balances: s.balances.filter((b) => !dates.includes(b.date)) }))
  }, [])

  return {
    accounts: state.accounts,
    subAccounts: state.subAccounts,
    balances: state.balances,
    loading: state.loading,
    error: state.error,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    addSubAccount,
    updateSubAccount,
    deleteSubAccount,
    addBalance,
    batchAddBalances,
    updateBalance,
    deleteBalance,
    batchDeleteBalances,
    batchDeleteByDate,
    reload: loadAll,
  }
}
