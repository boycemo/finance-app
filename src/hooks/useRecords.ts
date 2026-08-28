import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../utils/api'
import type { Category, FinanceRecord } from '../types'

interface State {
  records: FinanceRecord[]
  categories: Category[]
  loading: boolean
  error: string | null
  apiOnline: boolean
}

export function useRecords() {
  const [state, setState] = useState<State>({
    records: [],
    categories: [],
    loading: true,
    error: null,
    apiOnline: false,
  })

  const loadAll = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [records, categories] = await Promise.all([api.getRecords(), api.getCategories()])
      setState({
        records,
        categories,
        loading: false,
        error: null,
        apiOnline: true,
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err)
      setState((s) => ({
        ...s,
        loading: false,
        error: `后端连不上（${api.base}）。请确认后端服务已启动。错误：${msg}`,
        apiOnline: false,
      }))
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const addRecord = useCallback(
    async (r: Omit<FinanceRecord, 'id' | 'createdAt'>) => {
      const created = await api.addRecord(r)
      setState((s) => ({ ...s, records: [created, ...s.records] }))
    },
    [],
  )

  const updateRecord = useCallback(async (id: string, patch: Partial<FinanceRecord>) => {
    const updated = await api.updateRecord(id, patch)
    setState((s) => ({
      ...s,
      records: s.records.map((r) => (r.id === id ? updated : r)),
    }))
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    await api.deleteRecord(id)
    setState((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) }))
  }, [])

  const resetData = useCallback(async () => {
    await api.clearRecords()
    setState((s) => ({ ...s, records: [] }))
  }, [])

  return {
    records: state.records,
    categories: state.categories,
    loading: state.loading,
    error: state.error,
    apiOnline: state.apiOnline,
    addRecord,
    updateRecord,
    deleteRecord,
    resetData,
    reload: loadAll,
  }
}
